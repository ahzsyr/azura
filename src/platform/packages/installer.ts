import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDeploymentProfile, isModuleEnabled } from "@/config/deployment-profile";
import { getModuleManifests } from "@/config/deployment-profile/route-registry";
import { updateSiteFeatures, SiteFeatureUpdateError } from "@/config/deployment-profile/site-features";
import {
  AZURA_PACKAGE_MANIFEST,
  comparePackageVersions,
  isCompatibleWithCore,
  packageManifestFromModule,
  validatePackageManifest,
  validateZipEntryName,
  type PackageManifest,
  type PackageStatus,
} from "@/platform/packages/manifest";
import {
  applyPackageSql,
  PackageMigrationError,
  readPackageSqlFiles,
} from "@/platform/packages/package-migrations";
import {
  blockingDependents,
  inactiveRequiredPackages,
} from "@/platform/packages/lifecycle";
import { readStoredManifest } from "@/platform/packages/seed";
import { readStoreZip, writeStoreZip } from "@/platform/packages/zip-store";
import {
  envelopePendingTheme,
  envelopeWithThemeTokens,
  readInstallationEnvelope,
  writeInstallationEnvelope,
} from "@/platform/packages/installation-envelope";
import {
  AZURA_THEME_TOKENS,
  decideThemePackageImport,
} from "@/platform/packages/theme-token-package";
import { runThemePackageActivate } from "@/platform/packages/theme-package-activate";
import {
  runThemeAssetMaterialize,
  type ThemeAssetInventoryRow,
} from "@/platform/packages/theme-asset-materialize";
import { storeUploadedFile, deleteStoredAsset } from "@/lib/media-storage";
import { persistMediaUpload } from "@/features/media/persist-upload";
import {
  assertThemeDraftClean,
  commitThemeLedgerActive,
  mergePublishedWithPackagePatch,
  restorePublishedThemeFields,
  snapshotPublishedTheme,
  writePublishedThemeFields,
} from "@/platform/packages/theme-package-apply.server";
import {
  decideExtensionPackageImport,
  extensionOwnerModuleIds,
} from "@/platform/packages/extension-package";
import { validatePackageZipPass1 } from "@/platform/packages/package-zip-limits";

export class PackageInstallerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackageInstallerError";
  }
}

export type PackageRecord = {
  packageId: string;
  kind: string;
  version: string;
  status: PackageStatus;
  label: string;
  manifest: PackageManifest | null;
};

function asStatus(value: string): PackageStatus {
  if (value === "installed" || value === "active" || value === "inactive" || value === "pending") return value;
  return "installed";
}

function builtinManifest(packageId: string): PackageManifest | null {
  const manifest = getModuleManifests().find((entry) => entry.id === packageId);
  return manifest ? packageManifestFromModule(manifest) : null;
}

function assertIncluded(packageId: string): void {
  const profile = getDeploymentProfile();
  if (profile.generated && !isModuleEnabled(packageId) && builtinManifest(packageId)) {
    throw new PackageInstallerError(`${packageId} is not included in the deployment profile`);
  }
}

async function loadRow(packageId: string) {
  return prisma.packageInstallation.findUnique({ where: { packageId } });
}

function toRecord(row: {
  packageId: string;
  kind: string;
  version: string;
  status: string;
  manifest: Prisma.JsonValue;
}): PackageRecord {
  const manifest = readStoredManifest(row.manifest);
  return {
    packageId: row.packageId,
    kind: row.kind,
    version: row.version,
    status: asStatus(row.status),
    label: manifest?.label ?? row.packageId,
    manifest,
  };
}

export async function listInstalledPackages(): Promise<PackageRecord[]> {
  const rows = await prisma.packageInstallation.findMany({ orderBy: { packageId: "asc" } });
  return rows.map(toRecord);
}

async function writeStatus(packageId: string, status: PackageStatus, manifest?: PackageManifest, version?: string) {
  await prisma.packageInstallation.update({
    where: { packageId },
    data: {
      status,
      ...(version ? { version } : {}),
      ...(manifest ? { manifest: manifest as unknown as Prisma.InputJsonValue, kind: manifest.kind } : {}),
    },
  });
}

async function listDependencyRows(): Promise<
  Array<{ packageId: string; status: string; requiredPackages: string[] }>
> {
  const rows = await prisma.packageInstallation.findMany();
  return rows.map((row) => ({
    packageId: row.packageId,
    status: row.status,
    requiredPackages: readStoredManifest(row.manifest)?.requiredPackages ?? [],
  }));
}

async function dependents(packageId: string): Promise<string[]> {
  return blockingDependents(packageId, await listDependencyRows());
}

async function assertDependenciesActive(manifest: PackageManifest): Promise<void> {
  const inactive = inactiveRequiredPackages(
    manifest.id,
    manifest.requiredPackages,
    await listDependencyRows(),
  );
  if (inactive.length > 0) {
    throw new PackageInstallerError(
      `${manifest.id} requires ${inactive.join(", ")} to be active`,
    );
  }
}

async function applyPackageSqlOrThrow(
  packageId: string,
  version: string,
  direction: "up" | "down",
): Promise<number> {
  try {
    return await applyPackageSql(packageId, version, direction);
  } catch (error) {
    if (error instanceof PackageMigrationError) {
      throw new PackageInstallerError(error.message);
    }
    throw error;
  }
}

/** Install and activate every app included in the built deployment profile. Applies each app's SQL. */
export async function installIncludedProfilePackages(): Promise<void> {
  const profile = getDeploymentProfile();
  const ids = profile.generated
    ? [...profile.modules]
    : getModuleManifests().map((manifest) => manifest.id);
  const pending = new Set(ids);
  const ordered: string[] = [];
  while (pending.size > 0) {
    const ready = [...pending].filter((id) => {
      const required = builtinManifest(id)?.requiredPackages ?? [];
      return required.every((dependency) => !pending.has(dependency));
    });
    if (ready.length === 0) {
      ordered.push(...pending);
      break;
    }
    for (const id of ready) {
      pending.delete(id);
      ordered.push(id);
    }
  }
  for (const packageId of ordered) {
    if (!builtinManifest(packageId)) continue;
    await installPackage(packageId);
    await activatePackage(packageId);
  }
}

export async function installPackage(packageId: string): Promise<PackageRecord> {
  assertIncluded(packageId);
  const manifest = builtinManifest(packageId);
  if (!manifest) throw new PackageInstallerError(`${packageId} is not in this build`);
  if (!isCompatibleWithCore(manifest.azuraCompatibility)) {
    throw new PackageInstallerError(`${packageId} is not compatible with AZURA ${manifest.azuraCompatibility}`);
  }
  const existing = await loadRow(packageId);
  if (!existing) {
    await prisma.packageInstallation.create({
      data: {
        packageId,
        kind: manifest.kind,
        version: manifest.version,
        status: "installed",
        manifest: manifest as unknown as Prisma.InputJsonValue,
      },
    });
  }
  await applyPackageSqlOrThrow(packageId, manifest.version, "up");
  if (existing?.status === "active") {
    await writeStatus(packageId, "active", manifest, manifest.version);
  } else if (existing?.status !== "inactive") {
    await writeStatus(packageId, "installed", manifest, manifest.version);
  }
  const row = await loadRow(packageId);
  if (!row) throw new PackageInstallerError(`${packageId} was not installed`);
  return toRecord(row);
}

function isTokenThemeEnvelope(
  envelope: ReturnType<typeof readInstallationEnvelope>,
  packageId: string,
): boolean {
  return Boolean(
    envelope?.package.kind === "theme" &&
      envelope.artifacts?.themeTokens &&
      !builtinManifest(packageId),
  );
}

function isExtensionEnvelope(
  envelope: ReturnType<typeof readInstallationEnvelope>,
  packageId: string,
): boolean {
  return Boolean(envelope?.package.kind === "extension" && !builtinManifest(packageId));
}

async function activateExtensionPackage(packageId: string): Promise<PackageRecord> {
  const existing = await loadRow(packageId);
  const envelope = existing ? readInstallationEnvelope(existing.manifest) : null;
  const manifest = envelope?.package;
  if (!manifest || manifest.kind !== "extension") {
    throw new PackageInstallerError(`${packageId} is not an extension package`);
  }
  for (const owner of extensionOwnerModuleIds(manifest)) {
    if (!isModuleEnabled(owner)) {
      throw new PackageInstallerError(
        `${packageId} cannot open: owner module "${owner}" is not included in this deployment profile`,
      );
    }
  }
  await assertDependenciesActive(manifest);
  await writeStatus(packageId, "active");
  const row = await loadRow(packageId);
  if (!row) throw new PackageInstallerError(`${packageId} was not activated`);
  return toRecord(row);
}

async function deleteThemeMediaAsset(identity: {
  mediaId: string;
  storageBackend: string;
  bucket: string;
  objectKey: string;
}): Promise<boolean> {
  const storageOk = await deleteStoredAsset({
    storageBackend: identity.storageBackend,
    bucket: identity.bucket,
    objectKey: identity.objectKey,
  });
  try {
    await prisma.mediaAsset.delete({ where: { id: identity.mediaId } });
  } catch {
    return false;
  }
  if (!storageOk) {
    console.warn(
      `[theme-package] storage delete returned false for ${identity.objectKey} (mediaId=${identity.mediaId})`,
    );
  }
  return storageOk;
}

async function clearPendingGcThemeAssets(packageId: string): Promise<void> {
  const row = await loadRow(packageId);
  if (!row) return;
  const envelope = readInstallationEnvelope(row.manifest);
  if (!envelope?.artifacts?.pendingGcThemeAssets) return;
  const { pendingGcThemeAssets: _drop, ...restArtifacts } = envelope.artifacts;
  await prisma.packageInstallation.update({
    where: { packageId },
    data: {
      manifest: writeInstallationEnvelope({
        ...envelope,
        artifacts: restArtifacts,
      }),
    },
  });
}

async function activateTokenThemePackage(packageId: string): Promise<PackageRecord> {
  const result = await runThemePackageActivate(packageId, {
    loadEnvelope: async () => {
      const row = await loadRow(packageId);
      if (!row) return null;
      return readInstallationEnvelope(row.manifest);
    },
    assertDraftClean: assertThemeDraftClean,
    snapshotPublished: snapshotPublishedTheme,
    mergePatch: mergePublishedWithPackagePatch,
    writePublished: writePublishedThemeFields,
    commitThemeLedgerActive,
    restorePublished: restorePublishedThemeFields,
    deleteThemeAsset: deleteThemeMediaAsset,
    clearPendingGcThemeAssets,
  });
  if (!result.ok) {
    throw new PackageInstallerError(result.error);
  }
  const row = await loadRow(packageId);
  if (!row) throw new PackageInstallerError(`${packageId} was not activated`);
  return toRecord(row);
}

/**
 * Ensure a builtin PackageInstallation row exists before SiteFeature enable so
 * planPackageStatusSync can align status. Never leaves status=active if enable fails.
 * Order: deps → ensure row (installed/inactive) → up SQL → SiteFeature enable → finalize.
 */
export async function activatePackage(packageId: string): Promise<PackageRecord> {
  const existing = await loadRow(packageId);
  const envelope = existing ? readInstallationEnvelope(existing.manifest) : null;
  const storedManifest = envelope?.package ?? null;

  // Three-way non-builtin dispatch: theme tokens / extension overlay / else pending.
  if (isTokenThemeEnvelope(envelope, packageId)) {
    return activateTokenThemePackage(packageId);
  }
  if (isExtensionEnvelope(envelope, packageId)) {
    return activateExtensionPackage(packageId);
  }

  assertIncluded(packageId);
  const manifest = builtinManifest(packageId) ?? storedManifest;
  if (!manifest) throw new PackageInstallerError(`${packageId} is not installed`);
  if (!builtinManifest(packageId)) {
    throw new PackageInstallerError(`${packageId} is pending until its code is deployed`);
  }
  await assertDependenciesActive(manifest);

  let row = await loadRow(packageId);
  if (row && asStatus(row.status) === "active") {
    await writeStatus(packageId, "active", manifest, manifest.version);
    const current = await loadRow(packageId);
    if (!current) throw new PackageInstallerError(`${packageId} was not activated`);
    return toRecord(current);
  }

  if (!row) {
    await prisma.packageInstallation.create({
      data: {
        packageId,
        kind: manifest.kind,
        version: manifest.version,
        status: "installed",
        manifest: manifest as unknown as Prisma.InputJsonValue,
      },
    });
  } else {
    // Keep non-active before enable so a failed SiteFeature cannot look active.
    await writeStatus(
      packageId,
      asStatus(row.status) === "inactive" ? "inactive" : "installed",
      manifest,
      manifest.version,
    );
  }

  await applyPackageSqlOrThrow(packageId, manifest.version, "up");
  try {
    await updateSiteFeatures([{ kind: "module", featureId: packageId, enabled: true }]);
  } catch (error) {
    // Schema may be ahead; status must remain non-active (synced inactive/installed by sync or prior write).
    row = await loadRow(packageId);
    if (row && asStatus(row.status) === "active") {
      await writeStatus(packageId, "inactive", manifest, manifest.version);
    }
    if (error instanceof SiteFeatureUpdateError) throw new PackageInstallerError(error.message);
    throw error;
  }
  // SiteFeature sync should have set active; finalize version/manifest idempotently.
  await writeStatus(packageId, "active", manifest, manifest.version);
  const finalRow = await loadRow(packageId);
  if (!finalRow) throw new PackageInstallerError(`${packageId} was not activated`);
  return toRecord(finalRow);
}

export async function deactivatePackage(packageId: string): Promise<PackageRecord> {
  const blocking = await dependents(packageId);
  if (blocking.length > 0) {
    throw new PackageInstallerError(`${packageId} is required by ${blocking.join(", ")}`);
  }
  const existing = await loadRow(packageId);
  const envelope = existing ? readInstallationEnvelope(existing.manifest) : null;

  // Three-way: token theme / extension / builtin module — no SiteFeature or SQL for theme+extension.
  if (isTokenThemeEnvelope(envelope, packageId)) {
    const { clearThemePackageProvenance } = await import(
      "@/platform/packages/theme-package-apply.server"
    );
    await clearThemePackageProvenance(packageId);
    if (existing) await writeStatus(packageId, "inactive");
    const row = await loadRow(packageId);
    if (!row) throw new PackageInstallerError(`${packageId} is not installed`);
    return toRecord(row);
  }
  if (isExtensionEnvelope(envelope, packageId)) {
    if (existing && asStatus(existing.status) === "inactive") return toRecord(existing);
    if (existing) await writeStatus(packageId, "inactive");
    const row = await loadRow(packageId);
    if (!row) throw new PackageInstallerError(`${packageId} is not installed`);
    return toRecord(row);
  }

  if (existing && asStatus(existing.status) === "inactive") {
    try {
      await updateSiteFeatures([{ kind: "module", featureId: packageId, enabled: false }]);
    } catch (error) {
      if (error instanceof SiteFeatureUpdateError) throw new PackageInstallerError(error.message);
      throw error;
    }
    return toRecord(existing);
  }

  try {
    // SiteFeature path syncs PackageInstallation.status to inactive in the same transaction.
    await updateSiteFeatures([{ kind: "module", featureId: packageId, enabled: false }]);
  } catch (error) {
    if (error instanceof SiteFeatureUpdateError) throw new PackageInstallerError(error.message);
    throw error;
  }
  const row = await loadRow(packageId);
  if (!row) throw new PackageInstallerError(`${packageId} is not installed`);
  if (asStatus(row.status) !== "inactive") {
    await writeStatus(packageId, "inactive");
  }
  const finalRow = await loadRow(packageId);
  if (!finalRow) throw new PackageInstallerError(`${packageId} is not installed`);
  return toRecord(finalRow);
}

export async function updatePackage(packageId: string): Promise<PackageRecord> {
  const manifest = builtinManifest(packageId);
  if (!manifest) throw new PackageInstallerError(`${packageId} cannot be updated until its code is deployed`);
  const profile = getDeploymentProfile();
  if (!profile.generated) {
    throw new PackageInstallerError("A deployment profile has not been generated.");
  }
  if (!isModuleEnabled(packageId)) {
    throw new PackageInstallerError(`${packageId} is not included in the deployment profile`);
  }
  const existing = await loadRow(packageId);
  if (existing && asStatus(existing.status) === "pending") {
    throw new PackageInstallerError(`${packageId} is pending until its code is deployed`);
  }
  if (!existing) return installPackage(packageId);
  if (comparePackageVersions(existing.version, manifest.version) > 0) {
    throw new PackageInstallerError(`${packageId} cannot move from ${existing.version} to ${manifest.version} without a down migration`);
  }
  await applyPackageSqlOrThrow(packageId, manifest.version, "up");
  await writeStatus(packageId, asStatus(existing.status), manifest, manifest.version);
  const row = await loadRow(packageId);
  if (!row) throw new PackageInstallerError(`${packageId} was not updated`);
  return toRecord(row);
}

export async function uninstallPackage(packageId: string, destructive = false): Promise<void> {
  // Builtin Remove refuse first (included or omitted) — before dependents and before any down SQL.
  if (destructive && builtinManifest(packageId)) {
    throw new PackageInstallerError(
      `${packageId} cannot be removed from Modules while it ships in this build. Omit it from the deployment profile and redeploy.`,
    );
  }
  const blocking = await dependents(packageId);
  if (blocking.length > 0) {
    throw new PackageInstallerError(`${packageId} is required by ${blocking.join(", ")}`);
  }
  if (destructive) {
    const row = await loadRow(packageId);
    await applyPackageSqlOrThrow(packageId, row?.version ?? "0.0.0", "down");
  }
  const builtin = Boolean(builtinManifest(packageId));
  if (builtin && isModuleEnabled(packageId)) {
    await deactivatePackage(packageId);
    return;
  }
  try {
    await updateSiteFeatures([{ kind: "module", featureId: packageId, enabled: false }]);
  } catch (error) {
    if (!(error instanceof SiteFeatureUpdateError)) throw error;
  }
  await prisma.packageInstallation.deleteMany({ where: { packageId } });
}

export async function exportPackageZip(packageId: string): Promise<Buffer> {
  const row = await loadRow(packageId);
  const envelope = row ? readInstallationEnvelope(row.manifest) : null;
  const manifest =
    builtinManifest(packageId) ?? envelope?.package ?? (row ? readStoredManifest(row.manifest) : null);
  if (!manifest) throw new PackageInstallerError(`${packageId} is not installed`);
  const files = [{ name: AZURA_PACKAGE_MANIFEST, data: Buffer.from(JSON.stringify(manifest, null, 2)) }];
  if (envelope?.artifacts?.themeTokens) {
    files.push({
      name: AZURA_THEME_TOKENS,
      data: Buffer.from(JSON.stringify(envelope.artifacts.themeTokens, null, 2)),
    });
  }
  if (builtinManifest(packageId)) {
    for (const sql of await readPackageSqlFiles(packageId)) {
      files.push({ name: `migrations/${sql.filename}`, data: Buffer.from(sql.sql) });
    }
  }
  return writeStoreZip(files);
}

export async function importPackageZip(bytes: Buffer): Promise<PackageRecord> {
  const entries = readStoreZip(bytes);
  for (const entry of entries) {
    if (!validateZipEntryName(entry.name)) {
      throw new PackageInstallerError(`ZIP entry is not allowed: ${entry.name}`);
    }
  }
  const manifestEntry = entries.find((entry) => entry.name === AZURA_PACKAGE_MANIFEST);
  if (!manifestEntry) throw new PackageInstallerError("ZIP is missing azura-package.json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestEntry.data.toString("utf8"));
  } catch {
    throw new PackageInstallerError("azura-package.json is not valid JSON");
  }
  const validated = validatePackageManifest(parsed);
  if (!validated.ok) throw new PackageInstallerError(validated.errors.join(" "));
  const manifest = validated.manifest;
  if (!isCompatibleWithCore(manifest.azuraCompatibility)) {
    throw new PackageInstallerError(`${manifest.id} is not compatible with this AZURA version`);
  }
  // Theme ZIPs use theme-asset-limits; apps/extensions use global package ZIP caps.
  if (manifest.kind !== "theme") {
    const pass1 = validatePackageZipPass1({
      compressedBytes: bytes.byteLength,
      entryCount: entries.length,
    });
    if (!pass1.ok) throw new PackageInstallerError(pass1.error);
  }
  const builtin = builtinManifest(manifest.id);
  if (!builtin) {
    if (manifest.kind === "theme") {
      const tokensEntry = entries.find((entry) => entry.name === AZURA_THEME_TOKENS);
      const decision = decideThemePackageImport({
        manifest,
        entryNames: entries.map((e) => e.name),
        themeTokensBytes: tokensEntry ? tokensEntry.data : null,
        compressedBytes: bytes.byteLength,
        entryUncompressedBytes: entries.map((e) => ({
          name: e.name,
          uncompressedBytes: e.data.byteLength,
        })),
      });
      if (decision.action === "reject") {
        throw new PackageInstallerError(decision.errors.join(" "));
      }

      const priorRow = await loadRow(manifest.id);
      const priorEnvelope = priorRow ? readInstallationEnvelope(priorRow.manifest) : null;
      const pendingGc: ThemeAssetInventoryRow[] | undefined =
        priorEnvelope?.artifacts?.themeAssets;

      let themeAssets: ThemeAssetInventoryRow[] | undefined;
      if (decision.action === "installed") {
        const materialize = await runThemeAssetMaterialize(entries, {
          storeFile: storeUploadedFile,
          persistRow: async (input) => {
            const asset = await persistMediaUpload({
              ...input,
              assetScope: "CMS",
            });
            return { id: asset.id };
          },
          deleteAsset: deleteThemeMediaAsset,
        });
        if (!materialize.ok) {
          if (materialize.deleteFailures > 0) {
            console.warn(
              `[theme-package] import cleanup: ${materialize.deleteFailures} asset deletes failed`,
            );
          }
          throw new PackageInstallerError(materialize.error);
        }
        if (materialize.deleteFailures > 0) {
          console.warn(
            `[theme-package] import materialize reported ${materialize.deleteFailures} delete failures`,
          );
        }
        themeAssets = materialize.inventory;
      }

      const importedAt = new Date().toISOString();
      const envelope =
        decision.action === "installed"
          ? envelopeWithThemeTokens(
              manifest,
              decision.patch,
              {
                ...decision.tokenMeta,
                packageVersion: manifest.version,
                importedAt,
              },
              themeAssets,
              pendingGc,
            )
          : envelopePendingTheme(manifest);
      const status = decision.action === "installed" ? "installed" : "pending";
      await prisma.packageInstallation.upsert({
        where: { packageId: manifest.id },
        create: {
          packageId: manifest.id,
          kind: manifest.kind,
          version: manifest.version,
          status,
          manifest: writeInstallationEnvelope(envelope),
        },
        update: {
          kind: manifest.kind,
          version: manifest.version,
          status,
          manifest: writeInstallationEnvelope(envelope),
        },
      });
      const row = await loadRow(manifest.id);
      if (!row) throw new PackageInstallerError(`${manifest.id} was not imported`);
      return toRecord(row);
    }

    if (manifest.kind === "extension") {
      const profile = getDeploymentProfile();
      const decision = decideExtensionPackageImport({
        manifest,
        entryNames: entries.map((e) => e.name),
        enabledModuleIds: profile.modules,
      });
      if (decision.action === "reject") {
        throw new PackageInstallerError(decision.errors.join(" "));
      }
      const envelope = {
        format: 1 as const,
        package: manifest,
      };
      await prisma.packageInstallation.upsert({
        where: { packageId: manifest.id },
        create: {
          packageId: manifest.id,
          kind: manifest.kind,
          version: manifest.version,
          status: "installed",
          manifest: writeInstallationEnvelope(envelope),
        },
        update: {
          kind: manifest.kind,
          version: manifest.version,
          status: "installed",
          manifest: writeInstallationEnvelope(envelope),
        },
      });
      const row = await loadRow(manifest.id);
      if (!row) throw new PackageInstallerError(`${manifest.id} was not imported`);
      return toRecord(row);
    }

    await prisma.packageInstallation.upsert({
      where: { packageId: manifest.id },
      create: {
        packageId: manifest.id,
        kind: manifest.kind,
        version: manifest.version,
        status: "pending",
        manifest: manifest as unknown as Prisma.InputJsonValue,
      },
      update: {
        kind: manifest.kind,
        version: manifest.version,
        status: "pending",
        manifest: manifest as unknown as Prisma.InputJsonValue,
      },
    });
    const row = await loadRow(manifest.id);
    if (!row) throw new PackageInstallerError(`${manifest.id} was not imported`);
    return toRecord(row);
  }
  return installPackage(manifest.id);
}
