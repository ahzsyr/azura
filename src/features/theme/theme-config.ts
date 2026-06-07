import type { ThemeTokens } from "@/types/theme";
import type { SiteBrandConfig } from "@/types/site-identity";
import {
  DEFAULT_TYPOGRAPHY,
  THEME_PRESET_DEFAULTS,
} from "@/features/theme/tokens/design-tokens";
import type {
  FooterThemeSettings,
  HeaderThemeSettings,
  ThemeTypographySettings,
} from "@/schemas/theme";
import type { SiteTheme } from "@prisma/client";
import { normalizeBranding } from "@/features/navigation/branding-defaults";

export { DEFAULT_TYPOGRAPHY, THEME_PRESET_DEFAULTS };

export const DEFAULT_HEADER_CONFIG: HeaderThemeSettings = {
  showLogo: true,
  showNav: true,
  showSearch: true,
  showCta: true,
  sticky: true,
  ctaLabelEn: "",
  ctaLabelAr: "",
  ctaHref: "/contact",
};

export const DEFAULT_FOOTER_CONFIG: FooterThemeSettings = {
  columns: 3,
  showSocial: true,
  showQuickLinks: true,
  showContact: true,
  taglineEn: "",
  taglineAr: "",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function parseHeaderConfig(raw: unknown): HeaderThemeSettings {
  const r = asRecord(raw);
  return {
    showLogo: r.showLogo !== false,
    showNav: r.showNav !== false,
    showSearch: r.showSearch !== false,
    showCta: r.showCta !== false,
    sticky: r.sticky !== false,
    ctaLabelEn: typeof r.ctaLabelEn === "string" ? r.ctaLabelEn : DEFAULT_HEADER_CONFIG.ctaLabelEn,
    ctaLabelAr: typeof r.ctaLabelAr === "string" ? r.ctaLabelAr : DEFAULT_HEADER_CONFIG.ctaLabelAr,
    ctaHref: typeof r.ctaHref === "string" && r.ctaHref ? r.ctaHref : DEFAULT_HEADER_CONFIG.ctaHref,
  };
}

export function parseFooterConfig(raw: unknown): FooterThemeSettings {
  const r = asRecord(raw);
  const legacyColumns =
    typeof r.footerColumns === "number" ? r.footerColumns : undefined;
  const columns = typeof r.columns === "number" ? r.columns : legacyColumns;
  return {
    columns: columns === 2 || columns === 4 ? columns : 3,
    showSocial: r.showSocial !== false,
    showQuickLinks: r.showQuickLinks !== false,
    showContact: r.showContact !== false,
    taglineEn: typeof r.taglineEn === "string" ? r.taglineEn : "",
    taglineAr: typeof r.taglineAr === "string" ? r.taglineAr : "",
  };
}

export function parseTypography(raw: unknown): ThemeTypographySettings {
  const r = asRecord(raw);
  const scale = Number(r.headingScale);
  return {
    bodyFont: typeof r.bodyFont === "string" ? r.bodyFont : DEFAULT_TYPOGRAPHY.bodyFont,
    headingFont: typeof r.headingFont === "string" ? r.headingFont : DEFAULT_TYPOGRAPHY.headingFont,
    baseFontSize:
      typeof r.baseFontSize === "string" ? r.baseFontSize : DEFAULT_TYPOGRAPHY.baseFontSize,
    headingScale:
      Number.isFinite(scale) && scale >= 1 && scale <= 1.5
        ? scale
        : DEFAULT_TYPOGRAPHY.headingScale,
  };
}

export function parseBrandConfig(raw: unknown): SiteBrandConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return normalizeBranding({});
  }
  return normalizeBranding(raw as Partial<SiteBrandConfig>);
}

export function siteThemeToTokens(theme: SiteTheme): ThemeTokens {
  return {
    preset: theme.preset,
    activePresetId: theme.activePresetId ?? null,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    cursorEffect: theme.cursorEffect ?? null,
    backgroundEffect: theme.backgroundEffect ?? null,
    textEffect: theme.textEffect ?? null,
    cursorEffectEnabled: theme.cursorEffectEnabled ?? true,
    backgroundEffectEnabled: theme.backgroundEffectEnabled ?? true,
    textEffectEnabled: theme.textEffectEnabled ?? true,
    cardStyle: theme.cardStyle ?? null,
    borderStyle: theme.borderStyle ?? null,
    typography: parseTypography(theme.typography),
    faviconUrl: theme.faviconUrl,
    logoUrl: theme.logoUrl,
    brandConfig: parseBrandConfig(
      "brandConfig" in theme ? (theme as SiteTheme & { brandConfig?: unknown }).brandConfig : {},
    ),
    headerConfig: parseHeaderConfig(theme.headerConfig),
    footerConfig: parseFooterConfig(theme.footerConfig),
    animationsEnabled: theme.animationsEnabled,
    animationSpeed: theme.animationSpeed,
    lazyLoadEnabled: theme.lazyLoadEnabled,
    darkModeEnabled: theme.darkModeEnabled,
    spacingScale: theme.spacingScale,
    customCss: theme.customCss,
  };
}

export function resolveThemeColors(tokens: ThemeTokens): { primary: string; secondary: string } {
  const preset = THEME_PRESET_DEFAULTS[tokens.preset];
  if (tokens.preset === "CUSTOM") {
    return { primary: tokens.primaryColor, secondary: tokens.secondaryColor };
  }
  return {
    primary: tokens.primaryColor || preset.primaryColor,
    secondary: tokens.secondaryColor || preset.secondaryColor,
  };
}
