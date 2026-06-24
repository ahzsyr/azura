import type { ThemePreset } from "@prisma/client";
import type {
  FooterThemeSettings,
  HeaderThemeSettings,
  ThemeTypographySettings,
} from "@/schemas/theme";
import type { PresetColorTokens } from "@/features/theme/engine/types";
import type { SiteBrandConfig } from "@/types/site-identity";
import type { BackgroundEffectSettings } from "@/types/theme";
import type { ThemeTokens } from "@/types/theme";
import type { AppearanceMode } from "@/features/theme/engine/types";

/**
 * Nested theme configuration — migration target for flat SiteTheme / ThemeTokens fields.
 * Phase 1 adapter only; admin UI continues to use flat shapes until Phase 2.
 */
export type ThemeConfig = {
  appearance: {
    darkModeEnabled: boolean;
    defaultMode: AppearanceMode;
  };
  colors: {
    primary: string;
    secondary: string;
    presetColors?: PresetColorTokens | null;
  };
  typography: ThemeTypographySettings;
  layout: {
    spacingScale: number;
    lazyLoadEnabled: boolean;
  };
  motion: {
    animationsEnabled: boolean;
    animationSpeed: number;
  };
  effects: {
    cursor: string | null;
    background: string | null;
    text: string | null;
    cursorEnabled: boolean;
    backgroundEnabled: boolean;
    textEnabled: boolean;
  };
  cards: {
    style: string | null;
  };
  borders: {
    style: string | null;
  };
  backgrounds: {
    effect: string | null;
    settings: BackgroundEffectSettings;
  };
  presets: {
    preset: ThemePreset;
    siteDefaultPresetId: string | null;
  };
  accessibility: Record<string, never>;
  brand: {
    faviconUrl: string | null;
    logoUrl: string | null;
    brandConfig: SiteBrandConfig;
    headerConfig: HeaderThemeSettings;
    footerConfig: FooterThemeSettings;
  };
  customCss: string | null;
  themeProvenance: ThemeTokens["themeProvenance"];
};

/** Flat ThemeTokens → nested ThemeConfig (legacy adapter). */
export function tokensToThemeConfig(tokens: ThemeTokens): ThemeConfig {
  return {
    appearance: {
      darkModeEnabled: tokens.darkModeEnabled,
      defaultMode: tokens.darkModeEnabled ? "system" : "light",
    },
    colors: {
      primary: tokens.primaryColor,
      secondary: tokens.secondaryColor,
      presetColors: tokens.presetColors ?? null,
    },
    typography: tokens.typography,
    layout: {
      spacingScale: tokens.spacingScale,
      lazyLoadEnabled: tokens.lazyLoadEnabled,
    },
    motion: {
      animationsEnabled: tokens.animationsEnabled,
      animationSpeed: tokens.animationSpeed,
    },
    effects: {
      cursor: tokens.cursorEffect,
      background: tokens.backgroundEffect,
      text: tokens.textEffect,
      cursorEnabled: tokens.cursorEffectEnabled !== false,
      backgroundEnabled: tokens.backgroundEffectEnabled !== false,
      textEnabled: tokens.textEffectEnabled !== false,
    },
    cards: {
      style: tokens.cardStyle ?? null,
    },
    borders: {
      style: tokens.borderStyle ?? null,
    },
    backgrounds: {
      effect: tokens.backgroundEffect,
      settings: tokens.backgroundEffectSettings,
    },
    presets: {
      preset: tokens.preset,
      siteDefaultPresetId: tokens.siteDefaultPresetId ?? tokens.activePresetId ?? null,
    },
    accessibility: {},
    brand: {
      faviconUrl: tokens.faviconUrl,
      logoUrl: tokens.logoUrl,
      brandConfig: tokens.brandConfig,
      headerConfig: tokens.headerConfig,
      footerConfig: tokens.footerConfig,
    },
    customCss: tokens.customCss,
    themeProvenance: tokens.themeProvenance ?? null,
  };
}

/** Nested ThemeConfig → flat ThemeTokens (legacy adapter). */
export function themeConfigToTokens(config: ThemeConfig): ThemeTokens {
  return {
    preset: config.presets.preset,
    siteDefaultPresetId: config.presets.siteDefaultPresetId,
    activePresetId: config.presets.siteDefaultPresetId,
    primaryColor: config.colors.primary,
    secondaryColor: config.colors.secondary,
    cursorEffect: config.effects.cursor,
    backgroundEffect: config.effects.background,
    textEffect: config.effects.text,
    cursorEffectEnabled: config.effects.cursorEnabled,
    backgroundEffectEnabled: config.effects.backgroundEnabled,
    textEffectEnabled: config.effects.textEnabled,
    backgroundEffectSettings: config.backgrounds.settings,
    presetColors: config.colors.presetColors ?? null,
    cardStyle: config.cards.style,
    borderStyle: config.borders.style,
    typography: config.typography,
    faviconUrl: config.brand.faviconUrl,
    logoUrl: config.brand.logoUrl,
    brandConfig: config.brand.brandConfig,
    headerConfig: config.brand.headerConfig,
    footerConfig: config.brand.footerConfig,
    animationsEnabled: config.motion.animationsEnabled,
    animationSpeed: config.motion.animationSpeed,
    lazyLoadEnabled: config.layout.lazyLoadEnabled,
    darkModeEnabled: config.appearance.darkModeEnabled,
    spacingScale: config.layout.spacingScale,
    customCss: config.customCss,
    themeProvenance: config.themeProvenance ?? null,
  };
}
