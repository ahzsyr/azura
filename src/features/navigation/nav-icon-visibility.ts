import type { HeaderBuilderSettings, MenuIconPlacement, MenuItem } from "./types";
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

/**
 * Per-item nav glyph visibility.
 * - `both` — desktop and mobile/tablet
 * - `desktop` — main nav only
 * - `mobile` — mobile drawer and tablet band
 * - unset — header default for that breakpoint
 */
export function resolveItemShowsNavIcon(
  placement: MenuIconPlacement | undefined,
  breakpoint: NavIconBreakpoint,
  defaults: NavIconVisibility,
): boolean {
  if (placement === "both") return true;
  if (placement === "desktop") return breakpoint === "desktop";
  if (placement === "mobile") return breakpoint === "mobile" || breakpoint === "tablet";
  return defaults[breakpoint];
}

function itemForcesMobileIcon(item: MenuItem): boolean {
  if (item.iconPlacement === "mobile" || item.iconPlacement === "both") return true;
  return (item.children ?? []).some(itemForcesMobileIcon);
}

/** Mount the mobile drawer icon slots when defaults or any item asks for mobile/tablet icons. */
export function menuTreeForcesMobileIcons(items: MenuItem[]): boolean {
  return items.some(itemForcesMobileIcon);
}
