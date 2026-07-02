/**
 * Backward-compatible shim — site/section backgrounds live in @/features/theme/backgrounds.
 */
export {
  mountSectionBackgroundSync as initSectionBackgroundLayer,
} from "@/features/theme/backgrounds/section-runtime";

import { unmountSiteBackground } from "@/features/theme/backgrounds/site-runtime";

/** @deprecated Site backgrounds are mounted via SiteBackgroundLayer. */
export function initBackground(type: string) {
  if (type === "none" || !type) {
    unmountSiteBackground();
  }
}
