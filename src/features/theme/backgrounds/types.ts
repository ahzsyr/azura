/** Site-wide and section background effect identifiers. */
export type BackgroundEffectId =
  | "none"
  | "grid"
  | "particles"
  | "waves"
  | "stars"
  | "matrix"
  | "aurora"
  | "noise"
  | "hexagons"
  | "circuit"
  | "bubbles"
  | "geometric"
  | "vortex";

export type BackgroundEffectColorOverrides = {
  primary?: string;
  accent?: string;
  secondary?: string;
};

/** Persisted + runtime background tuning (DB JSON + CSS vars). */
export type BackgroundEffectSettings = {
  intensity: number;
  opacity: number;
  speed?: number;
  colors?: BackgroundEffectColorOverrides;
};

export const DEFAULT_BACKGROUND_EFFECT_SETTINGS: BackgroundEffectSettings = {
  intensity: 1,
  opacity: 1,
};

export type BackgroundRuntimeConfig = {
  intensity: number;
  opacity: number;
  speed: number;
  animationsEnabled: boolean;
  colors?: BackgroundEffectColorOverrides;
};

export type BackgroundScope = {
  kind: "site" | "section";
  host: HTMLElement;
  loopStopRef: { current: (() => void) | null };
  resizeCleanupRef: { current: (() => void) | null };
};

export type MouseTrackerState = {
  x: number;
  y: number;
  active: boolean;
};

export type BackgroundMountContext = {
  scope: BackgroundScope;
  config: BackgroundRuntimeConfig;
  startLoop: (
    draw: () => void,
    options?: { visibilityRoot?: HTMLElement },
  ) => () => void;
  getColor: (alpha: number, cssVar?: string) => string;
  getStarColor: (twinkle: number) => string;
  getMatrixTrail: () => string;
  getThemeColor: (name: string) => string;
  resolveColor: (color: string) => string;
  mouse?: MouseTrackerState;
  applyLayerOpacity: (el: HTMLElement) => void;
};

export type BackgroundEffectTier = "light" | "medium" | "heavy";

export type BackgroundEffectDefinition = {
  id: BackgroundEffectId;
  tier: BackgroundEffectTier;
  mount: (ctx: BackgroundMountContext) => () => void;
  updateSettings?: (ctx: BackgroundMountContext) => void;
};
