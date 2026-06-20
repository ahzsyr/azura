import type { BackgroundEffectSettings } from "@/types/theme";

export type AppearanceMode = "light" | "dark" | "system";

export type ResolvedAppearance = "light" | "dark";

export type PresetColorTokens = {
  primary: string;
  accent: string;
  secondary?: string;
  background?: string;
  surface?: string;
  text?: string;
  textMuted?: string;
};

export type PresetEffectsPayload = {
  cursor?: string | null;
  backgroundEffect?: string | null;
  textEffect?: string | null;
  cardStyle?: string | null;
  borderStyle?: string | null;
  backgroundEffectSettings?: BackgroundEffectSettings | null;
};

export type ApplyPresetPayload = {
  presetId: string;
  name?: string;
  colors: PresetColorTokens;
  visual?: import("@/features/theme/presets/preset-visual.types").PresetVisualSnapshot;
} & PresetEffectsPayload;

export type CatalogPresetApplyResult =
  | { ok: true; payload: ApplyPresetPayload }
  | {
      ok: false;
      status: number | null;
      reason: "unavailable" | "request_failed";
      message: string;
    };

export type UserCreatedPreset = {
  id: string;
  name: string;
  createdAt: number;
  colors: PresetColorTokens;
  cursor?: string | null;
  backgroundEffect?: string | null;
  textEffect?: string | null;
  cardStyle?: string | null;
  borderStyle?: string | null;
};

export type CursorPreference = "custom" | "normal";

export type VisitorPersonalization = {
  visitorPresetId: string | null;
  appearanceMode: AppearanceMode;
  cursorEffect: string | null;
  backgroundEffect: string | null;
  textEffect: string | null;
  cardStyle: string | null;
  borderStyle: string | null;
};

export type ThemeEngineSnapshot = {
  appearanceMode: AppearanceMode;
  resolvedAppearance: ResolvedAppearance;
  siteDefaultPresetId: string | null;
  visitorPresetId: string | null;
  effectivePresetId: string | null;
  activePresetSource: "site" | "catalog" | "user" | null;
  liveEffects: PresetEffectsPayload | null;
  cursorPreference: CursorPreference;
  /** Appearance change already applied inline — skip deferred listeners. */
  appearanceOnly?: boolean;
};
