/** Accept only non-empty color strings (hex, oklch, color-mix, etc.). */
export function coerceColorString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Convert #rrggbb to sRGB 0–1 channels. */
function hexToRgb(hex: string): [number, number, number] | null {
  const color = coerceColorString(hex);
  if (!color) return null;
  const normalized = color.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return [r / 255, g / 255, b / 255];
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Approximate hex → OKLCH for modern CSS output (SSR-safe, no DOM). */
export function hexToOklch(hex: string, fallback = "0.5 0 0"): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `oklch(${fallback})`;

  const [r, g, b] = rgb.map(srgbToLinear) as [number, number, number];
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + b2 * b2);
  let H = (Math.atan2(b2, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  const Lpct = Math.max(0, Math.min(1, L));
  const Cpct = Math.max(0, C);
  const Hpct = Number.isFinite(H) ? H : 0;

  return `oklch(${Lpct.toFixed(4)} ${Cpct.toFixed(4)} ${Hpct.toFixed(2)})`;
}

/** Prefer OKLCH in output; fall back to original hex when conversion fails. */
export function toModernColor(value: unknown): string {
  const color = coerceColorString(value);
  if (!color) return "";
  if (!color.startsWith("#")) return color;
  const oklch = hexToOklch(color);
  return oklch.startsWith("oklch(") ? oklch : color;
}

export function colorMix(
  base: string,
  mix: string,
  basePercent: number,
  space: "srgb" | "oklch" = "oklch",
): string {
  return `color-mix(in ${space}, ${base} ${basePercent}%, ${mix})`;
}

/** CSS light-dark() helper for static fallbacks. */
export function lightDark(light: string, dark: string): string {
  return `light-dark(${light}, ${dark})`;
}
