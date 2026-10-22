import type { CSSProperties } from "react";
import type { HeaderWorkspace } from "./types";
import {
  menuAppearanceDataAttributes,
  menuAppearanceStyle,
  resolveMenuAppearance,
  resolveMobileMenuAppearance,
} from "./header-menu-appearance";
import {
  navIconVisibilityDataAttributes,
  resolveNavIconVisibility,
} from "./nav-icon-visibility";

export type HeaderRootSurface = "site" | "preview";

/**
 * Edge-to-edge behaviour: page content passes under the bar and the bar is
 * padded into the device safe area. Purely additive — the bar's design,
 * radius, gap and borders are untouched (owned by edge-to-edge.css).
 *   on   – content underlay + safe-area padding (default)
 *   edge – safe-area padding, no content underlay
 *   off  – legacy static layout
 * Preview surfaces never opt in (the studio must show the static design).
 */
export type EdgeToEdgeMode = "on" | "edge" | "off";

export function resolveEdgeToEdgeMode(args: {
  requested?: boolean | null;
  isPreview: boolean;
}): EdgeToEdgeMode {
  if (args.isPreview) return "off";
  return args.requested === false ? "off" : "on";
}

export function isWorkspaceOverlayMode(
  overlayMode?: HeaderWorkspace["settings"]["overlayMode"],
): boolean {
  return overlayMode === "over-media" || overlayMode === "transparent-until-scroll";
}

export function buildHeaderRootPresentation(args: {
  workspace: HeaderWorkspace;
  surface?: HeaderRootSurface;
  themePreset?: string;
  sticky?: boolean;
  shellPlaceholder?: boolean;
  edgeToEdge?: boolean;
}): {
  id?: string;
  className: string;
  dataAttributes: Record<string, string | undefined>;
  style: CSSProperties;
} {
  const { settings } = args.workspace;
  const surface = args.surface ?? "site";
  const isPreview = surface === "preview";
  const menuAppearance = resolveMenuAppearance(settings);
  const mobileMenuAppearance = resolveMobileMenuAppearance(settings);
  const menuAttrs = menuAppearanceDataAttributes(menuAppearance);
  const iconAttrs = navIconVisibilityDataAttributes(resolveNavIconVisibility(settings));
  const workspaceHeaderOverlay = isWorkspaceOverlayMode(settings.overlayMode);
  const desktopModeForLayout = isPreview
    ? "static"
    : args.sticky === false
      ? "static"
      : (settings.headerDesktopMode ?? "sticky");

  const classNames = [`header-root`, `header-style-${settings.headerStyle}`];
  if (args.shellPlaceholder) {
    classNames.push("site-header-shell");
  }

  return {
    // SSR shell must not steal `#headerRoot` — HeaderDesktopBehavior looks it up by id.
    id: isPreview || args.shellPlaceholder ? undefined : "headerRoot",
    className: classNames.join(" "),
    dataAttributes: {
      "data-header-style": settings.headerStyle,
      "data-header-workspace-version": "1",
      "data-header-surface": surface,
      ...(args.shellPlaceholder ? { "data-header-shell": "true" } : {}),
      "data-header-overlay": workspaceHeaderOverlay ? "true" : undefined,
      "data-overlay-mode": settings.overlayMode ?? "none",
      "data-overlay-surface": settings.overlaySurface ?? "glass",
      "data-mobile-type": settings.mobileType,
      "data-mobile-nav-style": settings.mobileNavStyle ?? "minimal",
      "data-mobile-nav-animation": mobileMenuAppearance.animation,
      "data-mobile-nav-density": settings.mobileNavDensity ?? "comfortable",
      "data-header-desktop": desktopModeForLayout,
      // Edge-to-edge (content under bar + safe areas). Never on preview surfaces.
      "data-edge-to-edge": resolveEdgeToEdgeMode({
        requested: args.edgeToEdge,
        isPreview,
      }),
      "data-header-radius": settings.headerBorderRadius ?? "lg",
      "data-mobile-boxed-sticky": settings.mobileBoxedSticky === true ? "true" : "false",
      // Boxed on always keeps the floating top gap; flush only applies when boxed is off.
      "data-mobile-flush-top":
        settings.mobileBoxedSticky === true
          ? "false"
          : settings.mobileFlushTop === false
            ? "false"
            : "true",
      "data-theme-preset": args.themePreset ?? undefined,
      ...iconAttrs,
      ...menuAttrs,
    },
    style: menuAppearanceStyle(menuAppearance),
  };
}
