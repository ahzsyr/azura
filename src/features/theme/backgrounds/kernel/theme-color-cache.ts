import { isDarkAppearance, resolveCssColor } from "@/features/theme/effects/color-helper";

export type Rgb = { r: number; g: number; b: number };

/**
 * Draw loops call color helpers per particle per frame. Reading computed style
 * there forces a style recalc whenever the page is dirty (e.g. mobile menu open),
 * so resolved colors are cached until the theme can have changed.
 */
const MAX_AGE_MS = 1000;

let observer: MutationObserver | null = null;
let rgbCache = new Map<string, Rgb>();
let darkCache: boolean | null = null;
let cachedAt = 0;

function invalidate() {
  rgbCache = new Map();
  darkCache = null;
}

function ensureObserver() {
  if (observer || typeof MutationObserver === "undefined") return;
  observer = new MutationObserver(invalidate);
  // Not "style": pointer/scroll vars are written there every frame. Inline theme
  // var edits are picked up by MAX_AGE_MS instead.
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "data-theme-preset"],
  });
  observer.observe(document.head, { childList: true });
}

function freshen() {
  ensureObserver();
  const now = performance.now();
  if (now - cachedAt > MAX_AGE_MS) {
    invalidate();
    cachedAt = now;
  }
}

function hexToRgb(hex: string): Rgb {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

/** Resolve the first non-empty CSS var in `keys` (or `fallback`) to RGB, cached. */
export function cachedVarRgb(keys: string[], fallback?: () => string): Rgb | null {
  if (typeof document === "undefined") return null;
  freshen();
  const cacheKey = keys.join("|");
  const hit = rgbCache.get(cacheKey);
  if (hit) return hit;
  const style = getComputedStyle(document.documentElement);
  let value = "";
  for (const key of keys) {
    value = style.getPropertyValue(key).trim();
    if (value) break;
  }
  if (!value && fallback) value = fallback();
  if (!value) return null;
  const rgb = hexToRgb(resolveCssColor(value));
  rgbCache.set(cacheKey, rgb);
  return rgb;
}

/** Resolve a literal CSS color to RGB, cached. */
export function cachedColorRgb(color: string): Rgb {
  freshen();
  const cacheKey = `lit:${color}`;
  const hit = rgbCache.get(cacheKey);
  if (hit) return hit;
  const rgb = hexToRgb(resolveCssColor(color));
  rgbCache.set(cacheKey, rgb);
  return rgb;
}

export function cachedIsDark(): boolean {
  freshen();
  if (darkCache == null) darkCache = isDarkAppearance();
  return darkCache;
}

export function rgba({ r, g, b }: Rgb, alpha: number): string {
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}
