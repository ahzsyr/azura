import type { ThemeTokens } from "@/types/theme";
import type { ThemeProvenance } from "@/types/theme";
import type { SiteBrandConfig } from "@/types/site-identity";
import {
  DEFAULT_TYPOGRAPHY,
  THEME_PRESET_DEFAULTS,
} from "@/features/theme/tokens/design-tokens";
import { coerceColorString } from "@/lib/theme/tokens/color-utils";
import { parseBackgroundEffectSettings } from "@/features/theme/backgrounds/settings";
import type {
  FooterThemeSettings,
  HeaderThemeSettings,
  LocaleFontOverride,
  ThemeTypographySettings,
} from "@/schemas/theme";
import type { SiteTheme } from "@prisma/client";
import { canonicalSiteDefaultPresetId } from "@/features/theme/preset-identity";
import { normalizeBranding } from "@/features/navigation/branding-defaults";

export { DEFAULT_TYPOGRAPHY, THEME_PRESET_DEFAULTS };

export const DEFAULT_HEADER_CONFIG: HeaderThemeSettings = {
  showLogo: true,
  showNav: true,
  showSearch: true,
  showCta: true,
  sticky: true,
  ctaLabel: "",
  ctaHref: "/contact",
};

export const DEFAULT_FOOTER_CONFIG: FooterThemeSettings = {
  columns: 3,
  showSocial: true,
  showQuickLinks: true,
  showContact: true,
  tagline: "",
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
    ctaLabel:
      typeof r.ctaLabel === "string"
        ? r.ctaLabel
        : typeof r.ctaLabelEn === "string"
          ? r.ctaLabelEn
          : DEFAULT_HEADER_CONFIG.ctaLabel,
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
    tagline:
      typeof r.tagline === "string"
        ? r.tagline
        : typeof r.taglineEn === "string"
          ? r.taglineEn
          : "",
  };
}

function parseLocaleFonts(raw: unknown): Record<string, LocaleFontOverride> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const result: Record<string, LocaleFontOverride> = {};
  for (const [localeCode, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    const bodyFont = typeof e.bodyFont === "string" ? e.bodyFont : undefined;
    const headingFont = typeof e.headingFont === "string" ? e.headingFont : undefined;
    const htmlLang = typeof e.htmlLang === "string" ? e.htmlLang : undefined;
    if (bodyFont || headingFont) {
      result[localeCode] = {
        ...(bodyFont ? { bodyFont } : {}),
        ...(headingFont ? { headingFont } : {}),
        ...(htmlLang ? { htmlLang } : {}),
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function parseTypography(raw: unknown): ThemeTypographySettings {
  const r = asRecord(raw);
  const scale = Number(r.headingScale);
  const localeFonts = parseLocaleFonts(r.localeFonts);
  return {
    bodyFont: typeof r.bodyFont === "string" ? r.bodyFont : DEFAULT_TYPOGRAPHY.bodyFont,
    headingFont: typeof r.headingFont === "string" ? r.headingFont : DEFAULT_TYPOGRAPHY.headingFont,
    baseFontSize:
      typeof r.baseFontSize === "string" ? r.baseFontSize : DEFAULT_TYPOGRAPHY.baseFontSize,
    headingScale:
      Number.isFinite(scale) && scale >= 1 && scale <= 1.5
        ? scale
        : DEFAULT_TYPOGRAPHY.headingScale,
    ...(localeFonts ? { localeFonts } : {}),
  };
}

export function parseBrandConfig(raw: unknown): SiteBrandConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return normalizeBranding({});
  }
  return normalizeBranding(raw as Partial<SiteBrandConfig>);
}

function parseThemeProvenance(raw: unknown): ThemeProvenance | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  return {
    sourcePresetId:
      typeof record.sourcePresetId === "string" ? record.sourcePresetId : null,
    appliedAt: typeof record.appliedAt === "string" ? record.appliedAt : null,
  };
}

export function siteThemeToTokens(theme: SiteTheme): ThemeTokens {
  const siteDefaultPresetId = canonicalSiteDefaultPresetId(
    "siteDefaultPresetId" in theme
      ? (theme as SiteTheme & { siteDefaultPresetId?: string | null }).siteDefaultPresetId
      : null,
  );
  return {
    preset: theme.preset,
    siteDefaultPresetId,
    activePresetId: siteDefaultPresetId,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    cursorEffect: theme.cursorEffect ?? null,
    backgroundEffect: theme.backgroundEffect ?? null,
    textEffect: theme.textEffect ?? null,
    cursorEffectEnabled: theme.cursorEffectEnabled ?? true,
    backgroundEffectEnabled: theme.backgroundEffectEnabled ?? true,
    textEffectEnabled: theme.textEffectEnabled ?? true,
    backgroundEffectSettings: parseBackgroundEffectSettings(
      "backgroundEffectSettings" in theme
        ? (theme as SiteTheme & { backgroundEffectSettings?: unknown }).backgroundEffectSettings
        : {},
    ),
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
    themeProvenance: parseThemeProvenance(
      "themeProvenance" in theme
        ? (theme as SiteTheme & { themeProvenance?: unknown }).themeProvenance
        : {},
    ),
  };
}

export function resolveThemeColors(tokens: ThemeTokens): { primary: string; secondary: string } {
  const preset = THEME_PRESET_DEFAULTS[tokens.preset];
  if (tokens.preset === "CUSTOM") {
    return {
      primary: coerceColorString(tokens.primaryColor) ?? preset.primaryColor,
      secondary: coerceColorString(tokens.secondaryColor) ?? preset.secondaryColor,
    };
  }
  return {
    primary: coerceColorString(tokens.primaryColor) || preset.primaryColor,
    secondary: coerceColorString(tokens.secondaryColor) || preset.secondaryColor,
  };
}
