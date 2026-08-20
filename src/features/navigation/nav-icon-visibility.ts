import type { HeaderBuilderSettings } from "./types";
import {
  NAV_DESKTOP_MIN_PX,
  NAV_MOBILE_NARROW_MAX_PX,
  NAV_TABLET_MIN_PX,
} from "./nav-breakpoints";

export type NavIconVisibility = {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
};

export type NavIconBreakpoint = "mobile" | "tablet" | "desktop";

/**
 * Resolve per-breakpoint menu icon visibility.
 * - Defaults: all on when unset
 * - Legacy: `mobileNavShowIcons: false` also turns off tablet when `tabletNavShowIcons` is unset
 */
export function resolveNavIconVisibility(
  settings: Pick<
    HeaderBuilderSettings,
    "mobileNavShowIcons" | "tabletNavShowIcons" | "desktopNavShowIcons"
  >,
): NavIconVisibility {
  const mobile = settings.mobileNavShowIcons !== false;
  const tablet =
    settings.tabletNavShowIcons !== undefined
      ? settings.tabletNavShowIcons !== false
      : mobile;
  const desktop = settings.desktopNavShowIcons !== false;
  return { mobile, tablet, desktop };
}

/** Mount mobile-menu icon slots when mobile or tablet visibility is on (CSS hides per breakpoint). */
export function shouldMountMobileNavIcons(visibility: NavIconVisibility): boolean {
  return visibility.mobile || visibility.tablet;
}

export function navIconVisibilityDataAttributes(
  visibility: NavIconVisibility,
): Record<string, string> {
  return {
    "data-nav-icons-mobile": visibility.mobile ? "true" : "false",
    "data-nav-icons-tablet": visibility.tablet ? "true" : "false",
    "data-nav-icons-desktop": visibility.desktop ? "true" : "false",
  };
}

/** Map viewport width to the nav icon breakpoint band. */
export function resolveNavIconBreakpoint(widthPx: number): NavIconBreakpoint {
  if (widthPx <= NAV_MOBILE_NARROW_MAX_PX) return "mobile";
  if (widthPx >= NAV_TABLET_MIN_PX && widthPx < NAV_DESKTOP_MIN_PX) return "tablet";
  return "desktop";
}

/** Whether icons should show for the active viewport band. */
export function shouldShowNavIconsAtBreakpoint(
  visibility: NavIconVisibility,
  breakpoint: NavIconBreakpoint,
): boolean {
  return visibility[breakpoint];
}
