/** Hard upper bound for the boot overlay. Imported by generators, not by the inline script. */
export const PRELOADER_HARD_CAP_MS = 2000;

export const PRELOADER_SEEN_COOKIE = "az-preloader-seen";
export const PRELOADER_SEEN_MAX_AGE_SEC = 86400;

/** Session cookie. No Max-Age so it dies with the browser session. */
export const REDUCED_MOTION_COOKIE = "az-reduced-motion";

export function preloaderSeenCookieString(): string {
  return `${PRELOADER_SEEN_COOKIE}=1;path=/;max-age=${PRELOADER_SEEN_MAX_AGE_SEC};SameSite=Lax`;
}

export function reducedMotionCookieString(reduced: boolean): string {
  if (reduced) return `${REDUCED_MOTION_COOKIE}=1;path=/;SameSite=Lax`;
  return `${REDUCED_MOTION_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
}
