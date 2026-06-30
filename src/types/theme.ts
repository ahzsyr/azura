import type { ThemePreset } from "@prisma/client";
import type { SiteBrandConfig } from "@/types/site-identity";
import type { PresetColorTokens } from "@/features/theme/engine/types";
import type {
  BackgroundEffectSettings,
  FooterThemeSettings,
  HeaderThemeSettings,
  ThemeTypographySettings,
} from "@/schemas/theme";

export type { BackgroundEffectSettings };

export type { FooterThemeSettings, HeaderThemeSettings, ThemeTypographySettings };

/** @deprecated Use `HeaderThemeSettings` */
export type HeaderThemeConfig = HeaderThemeSettings;

/** @deprecated Use `FooterThemeSettings` */
export type FooterThemeConfig = FooterThemeSettings;

/** Palette overrides from industry presets (visitor session + SSR) */
export type PresetColors = PresetColorTokens;

export type ThemeProvenance = {
  sourcePresetId?: string | null;
  appliedAt?: string | null;
};

export type ThemeTokens = {
  preset: ThemePreset;
  /** Admin-owned default preset identifier persisted with site theme. */
  siteDefaultPresetId: string | null;
  /** @deprecated Use `siteDefaultPresetId`. */
  activePresetId?: string | null;
  primaryColor: string;
  secondaryColor: string;
  cursorEffect: string | null;
  backgroundEffect: string | null;
  textEffect: string | null;
  cursorEffectEnabled: boolean;
  backgroundEffectEnabled: boolean;
  textEffectEnabled: boolean;
  backgroundEffectSettings: BackgroundEffectSettings;
  presetColors?: PresetColors | null;
  cardStyle?: string | null;
  borderStyle?: string | null;
  typography: ThemeTypographySettings;
  faviconUrl: string | null;
  logoUrl: string | null;
  brandConfig: SiteBrandConfig;
  headerConfig: HeaderThemeSettings;
  footerConfig: FooterThemeSettings;
  animationsEnabled: boolean;
  animationSpeed: number;
  lazyLoadEnabled: boolean;
  darkModeEnabled: boolean;
  spacingScale: number;
  customCss: string | null;
  themeProvenance?: ThemeProvenance | null;
};

export { THEME_PRESET_DEFAULTS } from "@/features/theme/tokens/design-tokens";
