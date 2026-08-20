import type { CSSProperties } from "react";

/**
 * Font icon CSS helpers.
 * Font files may be linked via MediaAsset; IconAsset stores glyph metadata.
 */

export type FontIconCss = {
  fontFamily: string;
  className?: string;
};

const loadedFontKeys = new Set<string>();

export function fontIconClassName(family: string): string {
  const slug = family
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `icon-font-${slug}`;
}

export function buildFontIconStyle(family: string): CSSProperties {
  return { fontFamily: family, fontStyle: "normal", fontWeight: "normal" };
}

export function glyphFromUnicode(unicode?: string | null, fallbackGlyph?: string): string {
  if (unicode?.trim()) {
    const code = parseInt(unicode.trim(), 16);
    if (!Number.isNaN(code)) return String.fromCodePoint(code);
  }
  return fallbackGlyph ?? "";
}

/** Load a font file from CMS media URL for icon rendering (client-only). */
export async function ensureFontFaceLoaded(fontFamily: string, fontUrl: string): Promise<void> {
  if (typeof document === "undefined") return;
  const key = `${fontFamily}::${fontUrl}`;
  if (loadedFontKeys.has(key)) return;

  try {
    const face = new FontFace(fontFamily, `url("${fontUrl}")`);
    const loaded = await face.load();
    document.fonts.add(loaded);
    loadedFontKeys.add(key);
  } catch {
    // Theme CSS may already define @font-face for this family.
  }
}
