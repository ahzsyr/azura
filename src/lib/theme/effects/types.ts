/** Performance cost tier for a visual effect. */
export type EffectTier = "light" | "medium" | "heavy";

/** Where an effect setting originates in the inheritance chain. */
export type EffectScope = "site" | "page" | "block";

/** Inheritance mode for site → page → block effect layers. */
export type InheritanceMode = "inherit" | "off" | "custom" | "override" | "disabled";

export type EffectLayerInput = {
  mode?: InheritanceMode;
  enabled?: boolean;
  effectId?: string | null;
};

export type SiteEffectSource = {
  cursorEffect: string | null;
  backgroundEffect: string | null;
  textEffect: string | null;
  cursorEnabled: boolean;
  backgroundEnabled: boolean;
  textEnabled: boolean;
  animationsEnabled: boolean;
};

export type PageEffectOverrides = {
  siteEffects?: {
    cursor?: InheritanceMode;
    background?: InheritanceMode;
    text?: InheritanceMode;
  };
  cursorEffect?: string | null;
  backgroundEffect?: string | null;
  textEffect?: string | null;
  animationsEnabled?: boolean | null;
};

export type BlockEffectOverrides = {
  siteEffects?: {
    cursor?: "inherit" | "off";
    text?: InheritanceMode;
  };
  textEffect?: string | null;
  headingTextEffect?: string | "inherit" | "none";
};

/** Plain runtime input — effects engine never reads ThemeTokens or resolves theme. */
export type EffectRuntimeConfig = {
  cursor: { enabled: boolean; effectId: string | null };
  background: { enabled: boolean; effectId: string | null };
  text: { enabled: boolean; effectId: string | null };
  animationsEnabled: boolean;
  glassOverlay: boolean;
};

export type DeviceCapabilities = {
  prefersReducedMotion: boolean;
  lowEndDevice: boolean;
  touchOnly: boolean;
  smallScreen: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  effectiveConnection: string | null;
};

export type CapabilityPolicy = {
  allowHeavy: boolean;
  allowMedium: boolean;
  allowCustomCursor: boolean;
  allowAnimatedBackground: boolean;
  allowTextAnimation: boolean;
};

export type EffectEngineWarning = {
  tier: EffectTier;
  effectType: "cursor" | "background" | "text" | "transition";
  effectId: string;
  message: string;
};

export type EffectEngineSnapshot = {
  config: EffectRuntimeConfig | null;
  capabilities: DeviceCapabilities;
  policy: CapabilityPolicy;
  warnings: EffectEngineWarning[];
};

export interface EffectModule {
  initialize(): void;
  update(config: EffectRuntimeConfig, policy: CapabilityPolicy): void;
  destroy(): void;
}
