import { z } from "zod";
import { normalizeBranding } from "@/features/navigation/branding-defaults";

export const brandConfigSchema = z.record(z.unknown()).optional();

export const themePresetSchema = z.enum(["CLASSIC", "MODERN", "LUXURY", "CUSTOM"]);

export const typographySchema = z.object({
  bodyFont: z.string().default("Plus Jakarta Sans"),
  headingFont: z.string().default("Amiri"),
  baseFontSize: z.string().default("16px"),
  headingScale: z.number().min(1).max(1.5).default(1.25),
});

export const headerConfigSchema = z.object({
  showLogo: z.boolean().default(true),
  showNav: z.boolean().default(true),
  showSearch: z.boolean().default(true),
  showCta: z.boolean().default(true),
  sticky: z.boolean().default(true),
  ctaLabelEn: z.string().default(""),
  ctaLabelAr: z.string().default(""),
  ctaHref: z.string().default("/contact"),
});

export const footerConfigSchema = z.object({
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  showSocial: z.boolean().default(true),
  showQuickLinks: z.boolean().default(true),
  showContact: z.boolean().default(true),
  taglineEn: z.string().default(""),
  taglineAr: z.string().default(""),
});

/** @deprecated Use headerConfigSchema / footerConfigSchema */
export const headerFooterConfigSchema = headerConfigSchema;

export const backgroundEffectSettingsSchema = z
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
  activePresetId: z.string().nullable().optional(),
  cursorEffect: z.string().nullable().optional(),
  backgroundEffect: z.string().nullable().optional(),
  textEffect: z.string().nullable().optional(),
  cursorEffectEnabled: z.boolean().default(true),
  backgroundEffectEnabled: z.boolean().default(true),
  textEffectEnabled: z.boolean().default(true),
  backgroundEffectSettings: backgroundEffectSettingsSchema.optional(),
  cardStyle: z.string().nullable().optional(),
  borderStyle: z.string().nullable().optional(),
});

export type BackgroundEffectSettings = z.infer<typeof backgroundEffectSettingsSchema>;
export type SiteThemeInput = z.infer<typeof siteThemeSchema>;
export type ThemeTypographySettings = z.infer<typeof typographySchema>;
export type HeaderThemeSettings = z.infer<typeof headerConfigSchema>;
export type FooterThemeSettings = z.infer<typeof footerConfigSchema>;

/** Legacy alias */
export type HeaderThemeConfig = HeaderThemeSettings;
export type FooterThemeConfig = FooterThemeSettings;
