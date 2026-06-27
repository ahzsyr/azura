import type { CSSProperties } from "react";
import type { HeaderWorkspace } from "./types";
import {
  menuAppearanceDataAttributes,
  menuAppearanceStyle,
  resolveMenuAppearance,
  resolveMobileMenuAppearance,
} from "./header-menu-appearance";

export type HeaderRootSurface = "site" | "preview";

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
    id: isPreview ? undefined : "headerRoot",
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
      "data-header-radius": settings.headerBorderRadius ?? "lg",
      "data-theme-preset": args.themePreset ?? undefined,
      ...menuAttrs,
    },
    style: menuAppearanceStyle(menuAppearance),
  };
}
