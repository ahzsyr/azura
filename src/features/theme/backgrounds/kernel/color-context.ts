import {
  getEffectColor,
  getMatrixTrailColor,
  getStarFillColor,
  getThemeColor,
  resolveCssColor,
  themeColorWithAlpha,
} from "@/features/theme/effects/color-helper";
import type { BackgroundMountContext, BackgroundRuntimeConfig } from "../types";

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
      const override = overrideForVar(cssVar, config.colors);
      if (override) {
        const boosted = alpha * intensity;
        const hex = resolveCssColor(override);
        const r = Number.parseInt(hex.slice(1, 3), 16);
        const g = Number.parseInt(hex.slice(3, 5), 16);
        const b = Number.parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${Math.min(1, boosted)})`;
      }
      const chain = COLOR_VAR_MAP[cssVar];
      if (chain) {
        const fromCss = readCssColorChain(chain);
        if (fromCss) {
          const boosted = alpha * intensity;
          const hex = resolveCssColor(fromCss);
          const r = Number.parseInt(hex.slice(1, 3), 16);
          const g = Number.parseInt(hex.slice(3, 5), 16);
          const b = Number.parseInt(hex.slice(5, 7), 16);
          return `rgba(${r},${g},${b},${Math.min(1, boosted)})`;
        }
      }
      return getEffectColor(alpha * intensity, cssVar);
    },
    getStarColor(twinkle: number): string {
      const override = config.colors?.primary;
      if (override) {
        return themeColorWithAlpha(resolveCssColor(override), twinkle * intensity);
      }
      return getStarFillColor(twinkle * intensity);
    },
    getMatrixTrail(): string {
      return getMatrixTrailColor();
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
