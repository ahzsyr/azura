/**
 * Adapt TipTap / pasted rich-text HTML so default text colors follow the theme.
 *
 * Editors often bake in near-black or near-white `color` styles. Those stay
 * readable on light backgrounds but vanish in dark mode (and vice versa).
 * Neutral dark/light colors are stripped so text inherits `var(--foreground)`.
 * Chromatic accents (red, blue, …) are kept.
 */

type Rgb = { r: number; g: number; b: number };

const NAMED: Record<string, Rgb> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  windowtext: { r: 0, g: 0, b: 0 },
  canvastext: { r: 0, g: 0, b: 0 },
};

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** sRGB relative luminance (0–1). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

export function parseCssColor(value: string): Rgb | null {
  const raw = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!raw) return null;

  if (NAMED[raw]) return NAMED[raw]!;

  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (h.length === 8) h = h.slice(0, 6);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  const rgb = raw.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/);
  if (rgb) {
    return {
      r: clampByte(Number(rgb[1])),
      g: clampByte(Number(rgb[2])),
      b: clampByte(Number(rgb[3])),
    };
  }

  return null;
}

/** True when the color is a neutral ink/paper tone that should follow the theme. */
export function isThemeNeutralTextColor(value: string): boolean {
  // Already theme-aware — leave alone.
  if (/var\s*\(/i.test(value) || /currentcolor/i.test(value) || /inherit|unset|initial/i.test(value.trim())) {
    return false;
  }

  const rgb = parseCssColor(value);
  if (!rgb) return false;

  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const chroma = max - min;
  // Low chroma ≈ gray / black / white (not a deliberate accent).
  if (chroma > 36) return false;

  const L = relativeLuminance(rgb);
  // Dark ink or light paper used as “default” text.
  return L < 0.4 || L > 0.82;
}

function stripNeutralColorDeclarations(style: string): { style: string; changed: boolean } {
  let changed = false;
  const next = style
    .replace(/(?:^|;)\s*color\s*:\s*([^;]*?)\s*(?=;|$)/gi, (decl, colorValue: string) => {
      if (!isThemeNeutralTextColor(colorValue)) return decl;
      changed = true;
      return "";
    })
    .replace(/^\s*;\s*|\s*;\s*$/g, "")
    .replace(/;;+/g, ";")
    .trim();

  return { style: next, changed };
}

/** Rewrite HTML so neutral text colors inherit the active theme foreground. */
export function adaptRichTextHtmlColors(html: string): string {
  if (!html || !/color\s*:/i.test(html)) return html;

  return html.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (full, quote: string, styleContent: string) => {
    const { style, changed } = stripNeutralColorDeclarations(styleContent);
    if (!changed) return full;
    if (!style) return "";
    return ` style=${quote}${style}${quote}`;
  });
}
