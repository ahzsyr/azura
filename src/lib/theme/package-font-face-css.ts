/**
 * Safe @font-face emission for package typography.fontFaces (M7.2).
 * Pure — no Prisma / storage.
 */
import { FONT_FAMILY_CHARSET } from "@/platform/packages/theme-token-package";

export type PackageFontFaceInput = {
  family: string;
  url: string;
  format?: "woff2" | "woff" | "truetype" | "opentype";
};

const UPLOADS_URL = /^\/uploads\/[A-Za-z0-9._/-]+$/;
const FORMAT_SET = new Set(["woff2", "woff", "truetype", "opentype"]);

/** CSS-escape a font-family name and wrap in quotes. */
export function escapeCssFontFamily(family: string): string | null {
  const trimmed = family.trim();
  if (!FONT_FAMILY_CHARSET.test(trimmed)) return null;
  const escaped = trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export function isAllowedPackageFontUrl(url: string): boolean {
  return UPLOADS_URL.test(url.trim());
}

/**
 * Emit @font-face blocks. Invalid family/url/format entries are skipped
 * (caller may treat empty result as “no package faces”).
 */
export function formatPackageFontFaceCss(faces: PackageFontFaceInput[]): string {
  const blocks: string[] = [];
  for (const face of faces) {
    const family = escapeCssFontFamily(face.family);
    if (!family) continue;
    const url = face.url.trim();
    if (!isAllowedPackageFontUrl(url)) continue;
    const format =
      face.format && FORMAT_SET.has(face.format) ? face.format : undefined;
    // JSON.stringify produces a CSS-safe quoted URL string.
    const urlLit = JSON.stringify(url);
    const src = format
      ? `url(${urlLit}) format(${JSON.stringify(format)})`
      : `url(${urlLit})`;
    blocks.push(
      `@font-face{font-family:${family};src:${src};font-display:swap;}`,
    );
  }
  return blocks.join("\n");
}
