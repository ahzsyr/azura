import type { CSSProperties } from "react";
import type {
  HeaderBorderRadius,
  HeaderBuilderSettings,
  MenuBlurStrength,
  MenuPanelAnimation,
  MenuShadowStyle,
  MenuSurfaceStyle,
  MobileNavAnimation,
} from "./types";

const RADIUS_PX: Record<HeaderBorderRadius, number> = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
};

/** Mega/dropdown corners. Unset keeps the header corner radius. */
export function resolveMenuBorderRadius(settings: HeaderBuilderSettings): HeaderBorderRadius {
  return settings.menuBorderRadius ?? settings.headerBorderRadius ?? "lg";
}

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

/** Minimum glass opacity for mobile panels when admin has not set mobileMenuTransparency */
const MOBILE_GLASS_MIN_OPACITY = 96;

export type ResolvedMenuAppearance = {
  surface: MenuSurfaceStyle;
  glassEnabled: boolean;
  blurPx: number;
  transparency: number;
  shadow: MenuShadowStyle;
  animation: MenuPanelAnimation;
  radius: HeaderBorderRadius;
};

export type ResolvedMobileMenuAppearance = Omit<ResolvedMenuAppearance, "animation"> & {
  animation: MobileNavAnimation;
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
  const radius = resolveMenuBorderRadius(settings);

  return {
    surface,
    glassEnabled: surface === "glass" ? glassEnabled : false,
    blurPx,
    transparency,
    shadow,
    animation: animation as MenuPanelAnimation,
    radius,
  };
}

export function resolveMobileMenuAppearance(
  settings: HeaderBuilderSettings,
): ResolvedMobileMenuAppearance {
  const desktop = resolveMenuAppearance(settings);

  const surface: MenuSurfaceStyle =
    settings.mobileMenuSurface ??
    settings.menuSurface ??
    settings.overlaySurface ??
    "glass";

  const glassEnabled =
    settings.mobileMenuGlassEnabled ??
    settings.menuGlassEnabled ??
    (surface === "glass");

  const blurPx = BLUR_PX[settings.mobileMenuBlurStrength ?? settings.menuBlurStrength ?? "medium"];
  const shadow = settings.mobileMenuShadow ?? settings.menuShadow ?? "strong";

  const animation: MobileNavAnimation =
    settings.mobileMenuAnimation ??
    settings.mobileNavAnimation ??
    settings.menuPanelAnimation ??
    "slide";

  let transparency: number;
  if (settings.mobileMenuTransparency != null) {
    transparency = Math.min(98, Math.max(40, settings.mobileMenuTransparency));
  } else if (settings.menuTransparency != null) {
    transparency = Math.min(98, Math.max(40, settings.menuTransparency));
  } else if (surface === "glass") {
    transparency = MOBILE_GLASS_MIN_OPACITY;
  } else {
    transparency = desktop.transparency;
  }

  if (surface === "glass" && settings.mobileMenuTransparency == null) {
    transparency = Math.max(transparency, MOBILE_GLASS_MIN_OPACITY);
  }

  return {
    surface,
    glassEnabled: surface === "glass" ? glassEnabled : false,
    blurPx,
    transparency,
    shadow,
    animation,
    radius: settings.headerBorderRadius ?? "lg",
  };
}

/** Drawer timings are shorter than page motion so open/close feel immediate. */
const MOBILE_ENTER_MS = 140;
const MOBILE_EXIT_MS = 100;
const MOBILE_SPRING_ENTER_MS = 180;
const MNAV_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const MNAV_EASE_EXIT = "cubic-bezier(0.16, 1, 0.3, 1)";
const MNAV_EASE_SPRING = "cubic-bezier(0.22, 1.35, 0.36, 1)";

/** OS Reduce Motion, or the site motion level `off` / `reduced`. */
export function prefersReducedSiteMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  } catch {
    /* matchMedia unavailable */
  }
  const level = document.documentElement.getAttribute("data-motion");
  return level === "off" || level === "reduced";
}

export function getMobileAnimDuration(
  animation: MobileNavAnimation | MenuPanelAnimation,
  phase: "enter" | "exit" = "enter",
): number {
  if (prefersReducedSiteMotion()) return 0;
  if (phase === "exit") return MOBILE_EXIT_MS;
  if (animation === "spring") return MOBILE_SPRING_ENTER_MS;
  return MOBILE_ENTER_MS;
}

export function menuAppearanceDataAttributes(
  appearance: ResolvedMenuAppearance | ResolvedMobileMenuAppearance,
): Record<string, string> {
  return {
    "data-menu-surface": appearance.surface,
    "data-menu-glass": appearance.glassEnabled ? "true" : "false",
    "data-menu-blur": String(appearance.blurPx),
    "data-menu-opacity": String(appearance.transparency),
    "data-menu-shadow": appearance.shadow,
    "data-menu-animation": appearance.animation,
    "data-menu-radius": appearance.radius,
  };
}

/** CSS variables consumed by mega menu, dropdown, and mobile panels */
export function menuAppearanceStyle(
  appearance: ResolvedMenuAppearance | ResolvedMobileMenuAppearance,
): CSSProperties {
  const { surface, glassEnabled, blurPx, transparency, shadow, animation, radius } = appearance;
  const radiusPx = RADIUS_PX[radius];
  const opacity = transparency;
  const enterMs = getMobileAnimDuration(animation as MobileNavAnimation, "enter");
  const exitMs = getMobileAnimDuration(animation as MobileNavAnimation, "exit");
  const backdropEnterMs = enterMs === 0 ? 0 : Math.max(70, Math.round(enterMs * 0.65));
  const backdropExitMs = exitMs === 0 ? 0 : Math.max(60, Math.round(exitMs * 0.75));
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
    "--menu-radius": `${radiusPx}px`,
    "--menu-card-radius": `calc(${radiusPx}px * 0.65)`,
    "--mnav-duration": `${enterMs}ms`,
    "--mnav-duration-enter": `${enterMs}ms`,
    "--mnav-duration-exit": `${exitMs}ms`,
    "--mnav-duration-backdrop-enter": `${backdropEnterMs}ms`,
    "--mnav-duration-backdrop-exit": `${backdropExitMs}ms`,
    "--mnav-ease": animation === "spring" ? MNAV_EASE_SPRING : MNAV_EASE,
    "--mnav-ease-exit": MNAV_EASE_EXIT,
  } as CSSProperties;
}
