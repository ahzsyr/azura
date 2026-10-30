/**
 * Format-1 PackageInstallation.manifest envelope — stores PackageManifest plus
 * optional theme token / asset artifacts without a Prisma schema migration.
 */
import type { Prisma } from "@prisma/client";
import type { PackageManifest } from "@/platform/packages/manifest";
import type { ThemeTokenPatch, ThemeTokensMeta } from "@/platform/packages/theme-token-package";
import type { ThemeAssetInventoryRow } from "@/platform/packages/theme-asset-materialize";

export const INSTALLATION_ENVELOPE_FORMAT = 1 as const;

export type InstallationEnvelopeV1 = {
  format: typeof INSTALLATION_ENVELOPE_FORMAT;
  package: PackageManifest;
  artifacts?: {
    /** Durable patch with unresolved package: refs (resolve at activate). */
    themeTokens: ThemeTokenPatch;
    themeTokensMeta: ThemeTokensMeta;
    themeAssets?: ThemeAssetInventoryRow[];
    /**
     * Prior inventory retained across re-import until a successful activate GCs it.
     * Not exported; cleared after activate GC.
     */
    pendingGcThemeAssets?: ThemeAssetInventoryRow[];
  };
};

export function isInstallationEnvelopeV1(value: unknown): value is InstallationEnvelopeV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.format !== INSTALLATION_ENVELOPE_FORMAT) return false;
  const pkg = record.package;
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) return false;
  const id = (pkg as Record<string, unknown>).id;
  const kind = (pkg as Record<string, unknown>).kind;
  return typeof id === "string" && typeof kind === "string";
}

export function readInstallationEnvelope(value: Prisma.JsonValue | null | undefined): InstallationEnvelopeV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (isInstallationEnvelopeV1(value)) return value;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.kind !== "string") return null;
  return {
    format: INSTALLATION_ENVELOPE_FORMAT,
    package: value as unknown as PackageManifest,
  };
}

export function writeInstallationEnvelope(envelope: InstallationEnvelopeV1): Prisma.InputJsonValue {
  return envelope as unknown as Prisma.InputJsonValue;
}

export function envelopeWithThemeTokens(
  manifest: PackageManifest,
  themeTokens: ThemeTokenPatch,
  themeTokensMeta: ThemeTokensMeta,
  themeAssets?: ThemeAssetInventoryRow[],
  pendingGcThemeAssets?: ThemeAssetInventoryRow[],
): InstallationEnvelopeV1 {
  return {
    format: INSTALLATION_ENVELOPE_FORMAT,
    package: manifest,
    artifacts: {
      themeTokens,
      themeTokensMeta,
      ...(themeAssets && themeAssets.length > 0 ? { themeAssets } : {}),
      ...(pendingGcThemeAssets && pendingGcThemeAssets.length > 0
        ? { pendingGcThemeAssets }
        : {}),
    },
  };
}

export function envelopePendingTheme(manifest: PackageManifest): InstallationEnvelopeV1 {
  return { format: INSTALLATION_ENVELOPE_FORMAT, package: manifest };
}
