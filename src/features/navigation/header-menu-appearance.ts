import type { CSSProperties } from "react";
import type {
  HeaderBorderRadius,
  HeaderBuilderSettings,
  MenuBlurStrength,
  MenuPanelAnimation,
  MenuShadowStyle,
  MenuSurfaceStyle,
} from "./types";

const BLUR_PX: Record<MenuBlurStrength, number> = {
  light: 8,
  medium: 12,
  strong: 20,
};

const SHADOW_CSS: Record<MenuShadowStyle, string> = {
  none: "none",
  soft: "var(--header-shadow-soft, 0 2px 8px rgb(0 0 0 / 0.06))",
  strong: "0 25px 44px -24px rgba(0, 0, 0, 0.35)",
};

export type ResolvedMenuAppearance = {
  surface: MenuSurfaceStyle;
  glassEnabled: boolean;
  blurPx: number;
  transparency: number;
  shadow: MenuShadowStyle;
  animation: MenuPanelAnimation;
  radius: HeaderBorderRadius;
};

export function resolveMenuAppearance(settings: HeaderBuilderSettings): ResolvedMenuAppearance {
  const surface: MenuSurfaceStyle =
    settings.menuSurface ?? settings.overlaySurface ?? "glass";
  const glassEnabled =
    settings.menuGlassEnabled ?? (surface === "glass");
  const blurPx = BLUR_PX[settings.menuBlurStrength ?? "medium"];
  const transparency = Math.min(98, Math.max(40, settings.menuTransparency ?? 92));
  const shadow = settings.menuShadow ?? "strong";
  const animation =
    settings.menuPanelAnimation ?? settings.mobileNavAnimation ?? "slide";
  const radius = settings.headerBorderRadius ?? "lg";

  return {
    surface,
    glassEnabled: surface === "glass" ? glassEnabled : false,
    blurPx,
    transparency,
    shadow,
    animation,
    radius,
  };
}

export function menuAppearanceDataAttributes(
  appearance: ResolvedMenuAppearance,
): Record<string, string> {
  return {
    "data-menu-surface": appearance.surface,
    "data-menu-glass": appearance.glassEnabled ? "true" : "false",
    "data-menu-blur": String(appearance.blurPx),
    "data-menu-opacity": String(appearance.transparency),
    "data-menu-shadow": appearance.shadow,
    "data-menu-animation": appearance.animation,
  };
}

/** CSS variables consumed by mega menu, dropdown, and mobile panels */
export function menuAppearanceStyle(appearance: ResolvedMenuAppearance): CSSProperties {
  const { surface, glassEnabled, blurPx, transparency, shadow } = appearance;
  const opacity = transparency;
  const bgMix =
    surface === "transparent"
      ? "transparent"
      : surface === "solid"
        ? "var(--color-surface, var(--background))"
        : `color-mix(in srgb, var(--color-surface, var(--background)) ${opacity}%, transparent)`;

  return {
    "--menu-bg": bgMix,
    "--menu-border": "var(--cg2, var(--border))",
    "--menu-blur": glassEnabled && surface === "glass" ? `${blurPx}px` : "0px",
    "--menu-shadow": SHADOW_CSS[shadow],
    "--menu-card-radius": "calc(var(--header-radius, 16px) * 0.65)",
  } as CSSProperties;
}
