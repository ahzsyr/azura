export { visualEffectsEngine } from "./visual-effects-engine";
export { runWithViewTransition } from "./transition-engine";
export {
  detectDeviceCapabilities,
  buildCapabilityPolicy,
  getCapabilities,
  refreshCapabilities,
  subscribeCapabilityChanges,
} from "./capability-engine";
export {
  getBackgroundTier,
  getCursorTier,
  getTextTier,
  collectEffectWarnings,
} from "./effect-tiers";
export {
  resolvePageEffectConfig,
  resolveBlockTextEffect,
  mapVisualExperienceToEffectConfig,
} from "./inheritance";
export type {
  BlockEffectOverrides,
  CapabilityPolicy,
  DeviceCapabilities,
  EffectEngineSnapshot,
  EffectEngineWarning,
  EffectLayerInput,
  EffectModule,
  EffectRuntimeConfig,
  EffectScope,
  EffectTier,
  InheritanceMode,
  PageEffectOverrides,
  SiteEffectSource,
} from "./types";
