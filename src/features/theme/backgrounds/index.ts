export type {
  BackgroundEffectId,
  BackgroundEffectSettings,
  BackgroundRuntimeConfig,
  BackgroundEffectDefinition,
} from "./types";
export { DEFAULT_BACKGROUND_EFFECT_SETTINGS } from "./types";
export {
  parseBackgroundEffectSettings,
  resolveBackgroundRuntimeConfig,
  backgroundSettingsSignature,
} from "./settings";
export { readBackgroundConfig, runtimeConfigSignature } from "./config-reader";
export {
  mountSiteBackground,
  unmountSiteBackground,
  updateSiteBackgroundSettings,
} from "./site-runtime";
export { mountSectionBackground, mountSectionBackgroundSync } from "./section-runtime";
export { getEffect, listEffects, registerEffect, isEffectRegistered } from "./registry";
export { loadEffect, isLazyEffect } from "./lazy-imports";
