import {
  getEffectColor,
  getMatrixTrailColor,
  getStarFillColor,
  getThemeColor,
  resolveCssColor,
} from "@/features/theme/effects/color-helper";
import type { BackgroundMountContext, BackgroundRuntimeConfig } from "../types";

const COLOR_VAR_MAP: Record<string, string> = {
  "--color-primary": "--color-primary",
  "--color-accent": "--color-accent",
  "--color-secondary": "--color-secondary",
};

function overrideForVar(
  cssVar: string,
  colors: BackgroundRuntimeConfig["colors"],
): string | undefined {
  if (!colors) return undefined;
  if (cssVar.includes("accent")) return colors.accent;
  if (cssVar.includes("secondary")) return colors.secondary;
  return colors.primary;
}

export function createColorHelpers(config: BackgroundRuntimeConfig) {
  const intensity = config.intensity;

  return {
    getThemeColor(name: string): string {
      const override = overrideForVar(name, config.colors);
      return override ?? getThemeColor(name);
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
      return getEffectColor(alpha * intensity, COLOR_VAR_MAP[cssVar] ?? cssVar);
    },
    getStarColor(twinkle: number): string {
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
