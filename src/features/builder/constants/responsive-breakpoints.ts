/** Mobile max — align with globals.css @media (max-width: 768px) */
export const BUILDER_MOBILE_MAX_PX = 768;

/** Tablet max — align with nav-breakpoints (desktop nav from 969px) */
export const BUILDER_TABLET_MAX_PX = 968;

/** Max viewport width for native CSS slider tracks (covers iPad Pro portrait). */
export const SLIDER_NATIVE_MAX_PX = 1024;

export const BUILDER_DESKTOP_MIN_PX = 969;

export const BUILDER_BREAKPOINT_MQ = {
  mobile: `(max-width: ${BUILDER_MOBILE_MAX_PX}px)`,
  tablet: `(min-width: ${BUILDER_MOBILE_MAX_PX + 1}px) and (max-width: ${BUILDER_TABLET_MAX_PX}px)`,
  desktop: `(min-width: ${BUILDER_DESKTOP_MIN_PX}px)`,
} as const;
