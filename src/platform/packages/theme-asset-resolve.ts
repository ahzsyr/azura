/**
 * Resolve package: refs against themeAssets inventory at activate time (M7.2).
 */
import type { ThemeAssetInventoryRow } from "@/platform/packages/theme-asset-materialize";
import {
  isPackageAssetRef,
  packageRefToZipPath,
  type ThemeTokenPatch,
} from "@/platform/packages/theme-token-package";
import { extname } from "node:path";

export type ResolvedThemeFontFace = {
  family: string;
  url: string;
  format?: "woff2" | "woff" | "truetype" | "opentype";
};

export type ResolveThemeAssetRefsResult =
  | { ok: true; patch: ThemeTokenPatch & { typography?: ThemeTokenPatch["typography"] & { resolvedFontFaces?: ResolvedThemeFontFace[] } }; resolvedFontFaces: ResolvedThemeFontFace[] }
  | { ok: false; errors: string[] };

function formatForZipPath(zipPath: string): ResolvedThemeFontFace["format"] {
  const ext = extname(zipPath).toLowerCase();
  if (ext === ".woff2") return "woff2";
  if (ext === ".woff") return "woff";
  if (ext === ".ttf") return "truetype";
  if (ext === ".otf") return "opentype";
  return undefined;
}

function resolveRef(
  ref: string,
  byZipPath: Map<string, ThemeAssetInventoryRow>,
  errors: string[],
  label: string,
): string | undefined {
  if (!isPackageAssetRef(ref)) return ref;
  const zipPath = packageRefToZipPath(ref);
  if (!zipPath) {
    errors.push(`${label}: invalid package ref "${ref}"`);
    return undefined;
  }
  const row = byZipPath.get(zipPath);
  if (!row) {
    errors.push(`${label}: package ref "${ref}" has no materialized asset`);
    return undefined;
  }
  return row.url;
}

/**
 * Map package: refs to current MediaAsset URLs. Leaves non-package URLs as-is.
 * Attaches resolvedFontFaces for merge onto SiteTheme typography.
 */
export function resolveThemeTokenAssetRefs(
  patch: ThemeTokenPatch,
  inventory: ThemeAssetInventoryRow[],
): ResolveThemeAssetRefsResult {
  const byZipPath = new Map(inventory.map((row) => [row.zipPath, row]));
  const errors: string[] = [];
  const next: ThemeTokenPatch = { ...patch };

  if (typeof patch.logoUrl === "string") {
    const resolved = resolveRef(patch.logoUrl, byZipPath, errors, "logoUrl");
    if (resolved !== undefined) next.logoUrl = resolved;
  }
  if (typeof patch.faviconUrl === "string") {
    const resolved = resolveRef(patch.faviconUrl, byZipPath, errors, "faviconUrl");
    if (resolved !== undefined) next.faviconUrl = resolved;
  }

  const resolvedFontFaces: ResolvedThemeFontFace[] = [];
  if (patch.typography?.fontFaces?.length) {
    for (const face of patch.typography.fontFaces) {
      const url = resolveRef(face.src, byZipPath, errors, `fontFaces[${face.family}]`);
      if (url === undefined) continue;
      const zipPath = packageRefToZipPath(face.src) ?? "";
      resolvedFontFaces.push({
        family: face.family,
        url,
        ...(formatForZipPath(zipPath) ? { format: formatForZipPath(zipPath) } : {}),
      });
    }
    next.typography = {
      ...patch.typography,
      // Keep source faces in patch for debugging; merge uses resolvedFontFaces
      fontFaces: patch.typography.fontFaces,
    };
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, patch: next, resolvedFontFaces };
}
