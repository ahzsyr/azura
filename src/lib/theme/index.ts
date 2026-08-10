export { buildResolvedTheme } from "./theme-resolver.server";
export {
  buildResolvedThemeSync,
  generateHtmlAttributes,
  htmlAttributesToReactProps,
  mergeThemeSources,
  resolveAppearance,
  resolveMotion,
  resolvePresetVisual,
  resolveThemeTokens,
  type BuildResolvedThemeOptions,
  type HtmlAttributesInput,
  type MotionLevel,
  type PresetMetadata,
  type ResolvedMotion,
  type ResolvedTheme,
  type ThemeSourceInput,
} from "./theme-resolver";

export {
  themeConfigToTokens,
  tokensToThemeConfig,
  type ThemeConfig,
} from "./migration-adapters";

export {
  metricsToCssVarRecord,
  PRESET_METRICS_CSS_KEYS,
  getPresetMetricsBootPayload,
} from "./preset-metrics";

export {
  buildThemeBootPayload,
  generateThemeBootInlineScript,
  type ThemeBootPayload,
} from "./theme-boot";

export {
  resolveBrowserProjection,
  buildChromeViewport,
  buildChromeAppleWebApp,
  chromeViewportFallback,
  BROWSER_CHROME_FALLBACK,
  APPEARANCE_MODE_COOKIE,
  type BrowserProjection,
} from "./browser-chrome-projection";

export { buildThemeState, type ThemeState, type BuildThemeStateInput } from "./theme-state";

export {
  resolveForcedChromeColor,
  forcedModeOrNull,
  type ResolveForcedChromeColorInput,
} from "./resolve-forced-chrome-color";

export {
  syncSafariChromeTint,
  SAFARI_CHROME_TINT_VAR,
} from "./safari-chrome-tint";

export { reconcileSiteHtmlAttributes } from "./reconcile-html-attributes";

export {
  buildThemeTokenCss,
  CANONICAL_SEMANTIC_TOKENS,
  LEGACY_ALIAS_MAP,
  buildSemanticCss,
  buildAliasCss,
  buildTypographyCss,
  buildSpacingCss,
  buildMotionCss,
  type CanonicalSemanticToken,
  type SemanticTokenSet,
} from "./tokens";

export {
  visualEffectsEngine,
  runWithViewTransition,
  getCapabilities,
  collectEffectWarnings,
  resolvePageEffectConfig,
  mapVisualExperienceToEffectConfig,
  type EffectRuntimeConfig,
  type EffectTier,
  type DeviceCapabilities,
} from "./effects";

export {
  observeIntersection,
  deferUntilIdle,
  getThemePerformanceSnapshot,
  startThemePerformanceMonitoring,
  type ThemePerformanceSnapshot,
} from "@/lib/performance";
