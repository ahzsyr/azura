/**
 * Injected orchestrator for token theme package activation (M7 / M7.2).
 * Resolves package: asset refs before merge. CI proves compensation without Prisma.
 */
import type { InstallationEnvelopeV1 } from "@/platform/packages/installation-envelope";
import type { ThemeTokenPatch } from "@/platform/packages/theme-token-package";
import { resolveThemeTokenAssetRefs } from "@/platform/packages/theme-asset-resolve";
import type { ThemeAssetInventoryRow } from "@/platform/packages/theme-asset-materialize";
import { gcThemeAssetsNotIn } from "@/platform/packages/theme-asset-materialize";
import type { ThemeTokenMergeOptions } from "@/platform/packages/theme-package-apply";

export type ThemeActivateSnapshot = unknown;

export type ThemePackageActivateDeps<TPublished = unknown> = {
  loadEnvelope: () => Promise<InstallationEnvelopeV1 | null>;
  /** Previous envelope inventory for deferred GC (re-import). */
  loadPreviousThemeAssets?: () => Promise<ThemeAssetInventoryRow[] | undefined>;
  assertDraftClean: () => Promise<void>;
  snapshotPublished: () => Promise<TPublished>;
  mergePatch: (
    published: TPublished,
    patch: ThemeTokenPatch,
    packageId: string,
    packageVersion: string,
    options?: ThemeTokenMergeOptions,
  ) => TPublished;
  writePublished: (merged: TPublished) => Promise<void>;
  commitThemeLedgerActive: (packageId: string) => Promise<void>;
  restorePublished: (snapshot: TPublished) => Promise<void>;
  /** Best-effort delete of prior assets not in the new inventory. */
  deleteThemeAsset?: (identity: {
    mediaId: string;
    storageBackend: string;
    bucket: string;
    objectKey: string;
  }) => Promise<boolean>;
  /** Drop pendingGcThemeAssets from the ledger envelope after GC. */
  clearPendingGcThemeAssets?: (packageId: string) => Promise<void>;
};

export type ThemePackageActivateResult =
  | { ok: true; assetGcFailures?: number }
  | { ok: false; error: string; compensated?: boolean };

export class ThemePackageActivateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThemePackageActivateError";
  }
}

export async function runThemePackageActivate<TPublished>(
  packageId: string,
  deps: ThemePackageActivateDeps<TPublished>,
): Promise<ThemePackageActivateResult> {
  let envelope: InstallationEnvelopeV1 | null;
  try {
    envelope = await deps.loadEnvelope();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (!envelope) return { ok: false, error: `${packageId} is not installed` };
  if (envelope.package.kind !== "theme") {
    return { ok: false, error: `${packageId} is not a theme package` };
  }
  const artifacts = envelope.artifacts;
  if (!artifacts?.themeTokens) {
    return {
      ok: false,
      error: `${packageId} is pending until its code is deployed (no theme-tokens.json artifacts)`,
    };
  }

  const resolved = resolveThemeTokenAssetRefs(
    artifacts.themeTokens,
    artifacts.themeAssets ?? [],
  );
  if (!resolved.ok) {
    return { ok: false, error: resolved.errors.join(" ") };
  }

  try {
    await deps.assertDraftClean();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  let snapshot: TPublished;
  try {
    snapshot = await deps.snapshotPublished();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const previousAssets =
    artifacts.pendingGcThemeAssets ??
    (deps.loadPreviousThemeAssets ? await deps.loadPreviousThemeAssets().catch(() => undefined) : undefined);

  let merged: TPublished;
  try {
    merged = deps.mergePatch(
      snapshot,
      resolved.patch,
      packageId,
      envelope.package.version,
      { resolvedFontFaces: resolved.resolvedFontFaces },
    );
    await deps.writePublished(merged);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  try {
    await deps.commitThemeLedgerActive(packageId);
  } catch (error) {
    try {
      await deps.restorePublished(snapshot);
    } catch (restoreError) {
      return {
        ok: false,
        compensated: false,
        error: `${error instanceof Error ? error.message : String(error)}; restore also failed: ${
          restoreError instanceof Error ? restoreError.message : String(restoreError)
        }`,
      };
    }
    return {
      ok: false,
      compensated: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  let assetGcFailures = 0;
  if (deps.deleteThemeAsset && previousAssets?.length) {
    const gc = await gcThemeAssetsNotIn(
      previousAssets,
      artifacts.themeAssets ?? [],
      deps.deleteThemeAsset,
    );
    assetGcFailures = gc.failures;
    if (gc.failures > 0) {
      console.warn(
        `[theme-package] activate GC: ${gc.failures}/${gc.attempted} prior asset deletes failed for ${packageId}`,
      );
    }
  }

  if (deps.clearPendingGcThemeAssets && artifacts.pendingGcThemeAssets?.length) {
    try {
      await deps.clearPendingGcThemeAssets(packageId);
    } catch (error) {
      console.warn(
        `[theme-package] failed to clear pendingGcThemeAssets for ${packageId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return { ok: true, assetGcFailures };
}
