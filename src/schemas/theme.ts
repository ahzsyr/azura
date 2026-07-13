import { z } from "zod";
import { normalizeBranding } from "@/features/navigation/branding-defaults";

export const brandConfigSchema = z.record(z.unknown()).optional();

export const themePresetSchema = z.enum(["CLASSIC", "MODERN", "LUXURY", "CUSTOM"]);

export const localeFontOverrideSchema = z.object({
  bodyFont: z.string().optional(),
  headingFont: z.string().optional(),
  /** BCP 47 language tag used on `<html lang>` for CSS matching. */
  htmlLang: z.string().optional(),
});

export const typographySchema = z.object({
  bodyFont: z.string().default("Plus Jakarta Sans"),
  headingFont: z.string().default("Amiri"),
  baseFontSize: z.string().default("16px"),
  headingScale: z.number().min(1).max(1.5).default(1.25),
  localeFonts: z.record(localeFontOverrideSchema).optional(),
});

export const headerConfigSchema = z.object({
  showLogo: z.boolean().default(true),
  showNav: z.boolean().default(true),
  showSearch: z.boolean().default(true),
  showCta: z.boolean().default(true),
  sticky: z.boolean().default(true),
  ctaLabel: z.string().default(""),
  ctaHref: z.string().default("/contact"),
});

export const footerConfigSchema = z.object({
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  showSocial: z.boolean().default(true),
  showQuickLinks: z.boolean().default(true),
  showContact: z.boolean().default(true),
  tagline: z.string().default(""),
});

/** @deprecated Use headerConfigSchema / footerConfigSchema */
export const headerFooterConfigSchema = headerConfigSchema;

export const visualEffectSettingsSchema = z
  .object({
    intensity: z.number().min(0.25).max(1.5).default(1),
    opacity: z.number().min(0.1).max(1).default(1),
    speed: z.number().min(0.25).max(2).optional(),
    colors: z
      .object({
        primary: z.string().optional(),
        accent: z.string().optional(),
        secondary: z.string().optional(),
      })
      .optional(),
  })
  .default({ intensity: 1, opacity: 1 });

/** @deprecated Use `visualEffectSettingsSchema` */
export const backgroundEffectSettingsSchema = visualEffectSettingsSchema;

export const motionSettingsSchema = z
  .object({
    intensity: z.number().min(0.25).max(1.5).default(1),
    opacity: z.number().min(0.1).max(1).default(1),
  })
  .default({ intensity: 1, opacity: 1 });

export const themeProvenanceSchema = z
  .object({
    sourcePresetId: z.string().nullable().optional(),
    appliedAt: z.string().nullable().optional(),
  })
  .optional();

export const iosStatusBarStyleSchema = z
  .enum(["default", "black", "black-translucent"])
  .default("default");

export const mobileBrowserConfigSchema = z
  .object({
    syncWithTheme: z.boolean().default(true),
    browserThemeColorLight: z.string().nullable().optional(),
    browserThemeColorDark: z.string().nullable().optional(),
    browserBackgroundColor: z.string().nullable().optional(),
    iosStatusBarStyle: iosStatusBarStyleSchema.optional(),
  })
  .default({});

export const siteThemeSchema = z.object({
  preset: themePresetSchema.default("CLASSIC"),
  primaryColor: z.string().default("#047857"),
  secondaryColor: z.string().default("#d4af37"),
  typography: typographySchema.optional(),
  faviconUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  brandConfig: z.record(z.unknown()).optional(),
  headerConfig: headerConfigSchema.optional(),
  footerConfig: footerConfigSchema.optional(),
  animationsEnabled: z.boolean().default(true),
  animationSpeed: z.number().min(0.5).max(2).default(1),
  lazyLoadEnabled: z.boolean().default(true),
  darkModeEnabled: z.boolean().default(true),
  spacingScale: z.number().min(0.8).max(1.5).default(1),
  customCss: z.string().nullable().optional(),
  siteDefaultPresetId: z.string().nullable().optional(),
  /** @deprecated Use `siteDefaultPresetId`. */
  activePresetId: z.string().nullable().optional(),
  cursorEffect: z.string().nullable().optional(),
  backgroundEffect: z.string().nullable().optional(),
  textEffect: z.string().nullable().optional(),
  cursorEffectEnabled: z.boolean().default(true),
  backgroundEffectEnabled: z.boolean().default(true),
  textEffectEnabled: z.boolean().default(true),
  backgroundEffectSettings: backgroundEffectSettingsSchema.optional(),
  cursorEffectSettings: visualEffectSettingsSchema.optional(),
  textEffectSettings: visualEffectSettingsSchema.optional(),
  motionSettings: motionSettingsSchema.optional(),
  cardStyle: z.string().nullable().optional(),
  borderStyle: z.string().nullable().optional(),
  themeProvenance: themeProvenanceSchema,
  mobileBrowserConfig: mobileBrowserConfigSchema.optional(),
});

export type MobileBrowserConfig = z.infer<typeof mobileBrowserConfigSchema>;
export type IosStatusBarStyle = z.infer<typeof iosStatusBarStyleSchema>;
export type VisualEffectSettings = z.infer<typeof visualEffectSettingsSchema>;
export type MotionSettings = z.infer<typeof motionSettingsSchema>;
/** @deprecated Use `VisualEffectSettings` */
export type BackgroundEffectSettings = VisualEffectSettings;
export type SiteThemeInput = z.infer<typeof siteThemeSchema>;
export type LocaleFontOverride = z.infer<typeof localeFontOverrideSchema>;
export type ThemeTypographySettings = z.infer<typeof typographySchema>;
export type HeaderThemeSettings = z.infer<typeof headerConfigSchema>;
export type FooterThemeSettings = z.infer<typeof footerConfigSchema>;

/** Legacy alias */
export type HeaderThemeConfig = HeaderThemeSettings;
export type FooterThemeConfig = FooterThemeSettings;
