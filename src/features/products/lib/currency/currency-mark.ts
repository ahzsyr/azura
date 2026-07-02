import type { CurrencyEntry } from "./types";
import { sanitizeCurrencyInlineSvg } from "./inline-svg";

/** How the currency glyph renders in the region modal / pickers. */
export type CurrencyMarkRenderAs = "text" | "img" | "inlineSvg";

export interface ResolvedCurrencyMark {
  renderAs: CurrencyMarkRenderAs;
  /** Raster or SVG-as-file URL for `<img src>`. */
  imgSrc: string | null;
  /** Sanitized SVG document fragment for inline rendering. */
  inlineSvg: string | null;
  /** Fallback / text mode label (symbol or code). */
  text: string | null;
}

function normalizeAssetUrl(logo: string | undefined): string | null {
  const L = logo?.trim();
  if (!L) return null;
  if (L.startsWith("http://") || L.startsWith("https://")) return L;
  return L.startsWith("/") ? L : `/${L}`;
}

function inferDisplayMode(c: CurrencyEntry): NonNullable<CurrencyEntry["codeDisplay"]> {
  const logoUrl = normalizeAssetUrl(c.logo);
  const sanitized = c.svgInline?.trim() ? sanitizeCurrencyInlineSvg(c.svgInline) : null;
  if (sanitized) return "svg";
  if (logoUrl) return "image";
  return "text";
}

/**
 * Resolves how to render a currency row (text, raster image, SVG file, or inline SVG).
 * For `codeDisplay: "svg"`, inline markup wins over file URL when both are set.
 */
export function resolveCurrencyMark(c: CurrencyEntry): ResolvedCurrencyMark {
  const mode = c.codeDisplay ?? inferDisplayMode(c);
  const sym = c.symbol?.trim() || null;
  const code = c.code.trim().toUpperCase();
  const textFallback = sym || code;
  const logoUrl = normalizeAssetUrl(c.logo);
  const inlineSvg = c.svgInline?.trim() ? sanitizeCurrencyInlineSvg(c.svgInline) : null;

  if (mode === "text") {
    return { renderAs: "text", imgSrc: null, inlineSvg: null, text: textFallback };
  }

  if (mode === "image") {
    if (logoUrl) {
      return { renderAs: "img", imgSrc: logoUrl, inlineSvg: null, text: textFallback };
    }
    return { renderAs: "text", imgSrc: null, inlineSvg: null, text: textFallback };
  }

  // svg
  if (inlineSvg) {
    return { renderAs: "inlineSvg", imgSrc: null, inlineSvg, text: textFallback };
  }
  if (logoUrl) {
    return { renderAs: "img", imgSrc: logoUrl, inlineSvg: null, text: textFallback };
  }
  return { renderAs: "text", imgSrc: null, inlineSvg: null, text: textFallback };
}
