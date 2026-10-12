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
import { applyPackageSql, readPackageSqlFiles } from "@/platform/packages/package-migrations";
import { readStoredManifest } from "@/platform/packages/seed";
import { readStoreZip, writeStoreZip } from "@/platform/packages/zip-store";

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

async function dependents(packageId: string): Promise<string[]> {
  const rows = await prisma.packageInstallation.findMany({
    where: { status: { in: ["installed", "active"] } },
  });
  return rows
    .filter((row) => row.packageId !== packageId)
    .filter((row) => readStoredManifest(row.manifest)?.requiredPackages.includes(packageId))
    .map((row) => row.packageId);
}

async function assertDependenciesActive(manifest: PackageManifest): Promise<void> {
  for (const dependency of manifest.requiredPackages) {
    const row = await loadRow(dependency);
    if (!row || row.status !== "active") {
      throw new PackageInstallerError(`${manifest.id} requires ${dependency} to be active`);
    }
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
  await applyPackageSql(packageId, manifest.version, "up");
  if (existing?.status === "active") {
    await writeStatus(packageId, "active", manifest, manifest.version);
  } else if (existing?.status !== "inactive") {
    await writeStatus(packageId, "installed", manifest, manifest.version);
  }
  const row = await loadRow(packageId);
  if (!row) throw new PackageInstallerError(`${packageId} was not installed`);
  return toRecord(row);
}

export async function activatePackage(packageId: string): Promise<PackageRecord> {
  assertIncluded(packageId);
  const manifest = builtinManifest(packageId) ?? readStoredManifest((await loadRow(packageId))?.manifest ?? null);
  if (!manifest) throw new PackageInstallerError(`${packageId} is not installed`);
  if (!builtinManifest(packageId)) {
    throw new PackageInstallerError(`${packageId} is pending until its code is deployed`);
  }
  await assertDependenciesActive(manifest);
  await applyPackageSql(packageId, manifest.version, "up");
  try {
    await updateSiteFeatures([{ kind: "module", featureId: packageId, enabled: true }]);
  } catch (error) {
    if (error instanceof SiteFeatureUpdateError) throw new PackageInstallerError(error.message);
    throw error;
  }
  const existing = await loadRow(packageId);
  if (!existing) {
    await prisma.packageInstallation.create({
      data: {
        packageId,
        kind: manifest.kind,
        version: manifest.version,
        status: "active",
        manifest: manifest as unknown as Prisma.InputJsonValue,
      },
    });
  } else {
    await writeStatus(packageId, "active", manifest, manifest.version);
  }
  const row = await loadRow(packageId);
  if (!row) throw new PackageInstallerError(`${packageId} was not activated`);
  return toRecord(row);
}

export async function deactivatePackage(packageId: string): Promise<PackageRecord> {
  const blocking = await dependents(packageId);
  if (blocking.length > 0) {
    throw new PackageInstallerError(`${packageId} is required by ${blocking.join(", ")}`);
  }
  try {
    await updateSiteFeatures([{ kind: "module", featureId: packageId, enabled: false }]);
  } catch (error) {
    if (error instanceof SiteFeatureUpdateError) throw new PackageInstallerError(error.message);
    throw error;
  }
  const existing = await loadRow(packageId);
  if (existing) await writeStatus(packageId, "inactive");
  const row = await loadRow(packageId);
  if (!row) throw new PackageInstallerError(`${packageId} is not installed`);
  return toRecord(row);
}

export async function updatePackage(packageId: string): Promise<PackageRecord> {
  const manifest = builtinManifest(packageId);
  if (!manifest) throw new PackageInstallerError(`${packageId} cannot be updated until its code is deployed`);
  const existing = await loadRow(packageId);
  if (!existing) return installPackage(packageId);
  if (comparePackageVersions(existing.version, manifest.version) > 0) {
    throw new PackageInstallerError(`${packageId} cannot move from ${existing.version} to ${manifest.version} without a down migration`);
  }
  await applyPackageSql(packageId, manifest.version, "up");
  await writeStatus(packageId, asStatus(existing.status), manifest, manifest.version);
  const row = await loadRow(packageId);
  if (!row) throw new PackageInstallerError(`${packageId} was not updated`);
  return toRecord(row);
}

export async function uninstallPackage(packageId: string, destructive = false): Promise<void> {
  const blocking = await dependents(packageId);
  if (blocking.length > 0) {
    throw new PackageInstallerError(`${packageId} is required by ${blocking.join(", ")}`);
  }
  if (destructive) {
    const row = await loadRow(packageId);
    await applyPackageSql(packageId, row?.version ?? "0.0.0", "down");
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
  const manifest = builtinManifest(packageId) ?? (row ? readStoredManifest(row.manifest) : null);
  if (!manifest) throw new PackageInstallerError(`${packageId} is not installed`);
  const files = [{ name: AZURA_PACKAGE_MANIFEST, data: Buffer.from(JSON.stringify(manifest, null, 2)) }];
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
  const builtin = builtinManifest(manifest.id);
  if (!builtin) {
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
