import { getThemeColor, resolveCssColor } from "@/features/theme/effects/color-helper";
import type { BackgroundMountContext, BackgroundRuntimeConfig } from "../types";
import { cachedColorRgb, cachedIsDark, cachedVarRgb, rgba } from "./theme-color-cache";

const FALLBACK_COLOR = "#047857";
const LIGHT_ALPHA_BOOST = 1.75;

const THEME_FALLBACK_VARS: Record<string, string[]> = {
  "--color-primary": ["--color-primary", "--primary"],
  "--color-accent": ["--color-accent", "--accent"],
  "--color-secondary": ["--color-secondary", "--gold"],
};

/** Same result as `getEffectColor`, without reading computed style every call. */
function effectColor(alpha: number, cssVar: string): string {
  const base =
    cachedVarRgb(THEME_FALLBACK_VARS[cssVar] ?? [cssVar], () => FALLBACK_COLOR) ??
    cachedColorRgb(FALLBACK_COLOR);
  const boosted = cachedIsDark() ? alpha : Math.min(1, alpha * LIGHT_ALPHA_BOOST);
  return rgba(base, boosted);
}

/** Prefer effect override CSS vars, then brand aliases. */
const COLOR_VAR_MAP: Record<string, string[]> = {
  "--color-primary": ["--bg-effect-primary", "--color-primary", "--primary"],
  "--color-accent": ["--bg-effect-accent", "--color-accent", "--accent"],
  "--color-secondary": [
    "--bg-effect-secondary",
    "--bg-effect-accent",
    "--color-accent",
    "--accent",
  ],
};

function overrideForVar(
  cssVar: string,
  colors: BackgroundRuntimeConfig["colors"],
): string | undefined {
  if (!colors) return undefined;
  if (cssVar.includes("accent")) return colors.accent;
  if (cssVar.includes("secondary")) return colors.secondary ?? colors.accent;
  return colors.primary;
}

function readCssColorChain(keys: string[]): string {
  if (typeof document === "undefined") return "";
  const style = getComputedStyle(document.documentElement);
  for (const key of keys) {
    const value = style.getPropertyValue(key).trim();
    if (value) return value;
  }
  return "";
}

export function createColorHelpers(config: BackgroundRuntimeConfig) {
  const intensity = config.intensity;

  return {
    getThemeColor(name: string): string {
      const override = overrideForVar(name, config.colors);
      if (override) return override;
      const chain = COLOR_VAR_MAP[name];
      if (chain) {
        const fromCss = readCssColorChain(chain);
        if (fromCss) return fromCss;
      }
      return getThemeColor(name);
    },
    resolveColor(color: string): string {
      return resolveCssColor(color);
    },
    getColor(alpha: number, cssVar = "--color-primary"): string {
      const boosted = alpha * intensity;
      const override = overrideForVar(cssVar, config.colors);
      if (override) return rgba(cachedColorRgb(override), boosted);
      const chain = COLOR_VAR_MAP[cssVar];
      const fromCss = chain ? cachedVarRgb(chain) : null;
      if (fromCss) return rgba(fromCss, boosted);
      return effectColor(boosted, cssVar);
    },
    getStarColor(twinkle: number): string {
      const alpha = twinkle * intensity;
      const override = config.colors?.primary;
      if (override) return rgba(cachedColorRgb(override), alpha);
      if (cachedIsDark()) return `rgba(255,255,255,${alpha})`;
      return effectColor(alpha * 0.85, "--color-primary");
    },
    getMatrixTrail(): string {
      return cachedIsDark() ? "rgba(1,4,9,0.05)" : "rgba(250,250,250,0.08)";
    },
  };
}

export function applyLayerOpacity(el: HTMLElement, opacity: number): void {
  el.style.opacity = String(Math.max(0.1, Math.min(1, opacity)));
}

export function bindMountContextColors(
  ctx: BackgroundMountContext,
): Pick<
  BackgroundMountContext,
  "getColor" | "getStarColor" | "getMatrixTrail" | "getThemeColor" | "resolveColor" | "applyLayerOpacity"
> {
  const helpers = createColorHelpers(ctx.config);
  return {
    getColor: helpers.getColor,
    getStarColor: helpers.getStarColor,
    getMatrixTrail: helpers.getMatrixTrail,
    getThemeColor: helpers.getThemeColor,
    resolveColor: helpers.resolveColor,
    applyLayerOpacity: (el) => applyLayerOpacity(el, ctx.config.opacity),
  };
}
