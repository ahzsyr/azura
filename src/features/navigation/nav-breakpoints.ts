/** Narrow phone — keep in sync with header-builder.css @media (max-width: 640px) */
export const NAV_MOBILE_NARROW_MAX_PX = 640;

/** Tablet band starts after narrow mobile — keep in sync with branding / CSS (641–968) */
export const NAV_TABLET_MIN_PX = 641;

/** Mobile nav breakpoint — keep in sync with header-builder.css @media (max-width: 968px) */
export const NAV_MOBILE_MAX_PX = 968;

/** First pixel where desktop main-nav is shown */
export const NAV_DESKTOP_MIN_PX = NAV_MOBILE_MAX_PX + 1;

export const NAV_MOBILE_MQ = `(max-width: ${NAV_MOBILE_MAX_PX}px)`;
export const NAV_MOBILE_NARROW_MQ = `(max-width: ${NAV_MOBILE_NARROW_MAX_PX}px)`;
export const NAV_TABLET_MQ = `(min-width: ${NAV_TABLET_MIN_PX}px) and (max-width: ${NAV_MOBILE_MAX_PX}px)`;
export const NAV_DESKTOP_MQ = `(min-width: ${NAV_DESKTOP_MIN_PX}px)`;
