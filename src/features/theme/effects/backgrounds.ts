/**
 * @deprecated Site/section backgrounds live in @/features/theme/backgrounds.
 * Kept as a thin shim for legacy imports — do not add new callers.
 */
export {
  mountSectionBackgroundSync as initSectionBackgroundLayer,
} from "@/features/theme/backgrounds/section-runtime";

import { unmountSiteBackground } from "@/features/theme/backgrounds/site-runtime";

/** @deprecated Site backgrounds are mounted via SiteBackgroundLayer + visualEffectsEngine. */
export function initBackground(type: string) {
  if (type === "none" || !type) {
    unmountSiteBackground();
  }
}
