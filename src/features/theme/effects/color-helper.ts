/** Read theme CSS vars with fallbacks for Astro-compat aliases. */
export function getThemeColor(name: string): string {
  const style = getComputedStyle(document.documentElement);
  const fallbacks: Record<string, string[]> = {
    "--color-primary": ["--color-primary", "--primary"],
    "--color-accent": ["--color-accent", "--accent"],
    "--color-secondary": ["--color-secondary", "--gold"],
  };
  const keys = fallbacks[name] ?? [name];
  for (const key of keys) {
    const value = style.getPropertyValue(key).trim();
    if (value) return value;
  }
  return "#047857";
}

let colorProbe: CanvasRenderingContext2D | null = null;

/** Normalize any CSS color string to #rrggbb via canvas fillStyle resolution. */
export function resolveCssColor(color: string): string {
  if (typeof document === "undefined") return "#047857";
  if (!colorProbe) {
    const canvas = document.createElement("canvas");
    colorProbe = canvas.getContext("2d");
  }
  if (!colorProbe) return "#047857";
  colorProbe.fillStyle = "#000000";
  colorProbe.fillStyle = color;
  const resolved = colorProbe.fillStyle;
  if (typeof resolved === "string" && resolved.startsWith("#")) {
    return resolved.length === 4
      ? `#${resolved[1]}${resolved[1]}${resolved[2]}${resolved[2]}${resolved[3]}${resolved[3]}`
      : resolved;
  }
  return "#047857";
}

/** True when the active storefront appearance is dark. */
export function isDarkAppearance(): boolean {
  if (typeof document === "undefined") return true;
  const root = document.documentElement;
  return root.classList.contains("dark") || root.dataset.theme === "dark";
}

/** Apply alpha to any CSS color — safe for canvas fillStyle/strokeStyle. */
export function themeColorWithAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const hex = resolveCssColor(color);
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${clamped})`;
}

const LIGHT_ALPHA_BOOST = 1.75;

/**
 * Primary theme color with alpha for canvas effects.
 * Boosts opacity in light mode so effects remain visible on white surfaces.
 */
export function getEffectColor(alpha: number, cssVar = "--color-primary"): string {
  const base = getThemeColor(cssVar);
  const boosted = isDarkAppearance() ? alpha : Math.min(1, alpha * LIGHT_ALPHA_BOOST);
  return themeColorWithAlpha(base, boosted);
}

/** Star / noise pixel tint — primary in light mode, white in dark mode. */
export function getStarFillColor(twinkle: number): string {
  if (isDarkAppearance()) {
    return `rgba(255,255,255,${twinkle})`;
  }
  return getEffectColor(twinkle * 0.85);
}

/** Matrix trail wash — theme-aware background fade per frame. */
export function getMatrixTrailColor(): string {
  if (isDarkAppearance()) {
    return "rgba(1,4,9,0.05)";
  }
  return "rgba(250,250,250,0.08)";
}
