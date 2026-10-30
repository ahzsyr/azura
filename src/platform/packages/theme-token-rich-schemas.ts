/**
 * Package-strict Zod twins for M7.3 rich theme fields.
 * No .default() / .catch() / withObjectDefaults — omitted keys reject.
 * Anti-drift: PACKAGE_*_KEYS Record<keyof StudioType, true>.
 */
import { z } from "zod";
import type {
  FooterThemeSettings,
  HeaderThemeSettings,
  MobileBrowserConfig,
  MotionSettings,
  VisualEffectSettings,
} from "@/schemas/theme";
import type {
  BrandingState,
  BrandLogoSizing,
  BrandNameTypography,
  BrandTaglineTypography,
} from "@/features/navigation/types";

const chromeVisibilityMode = z.enum(["all", "selected", "except"]);

/** Studio header output keys — package twin must stay complete. */
export const PACKAGE_HEADER_CONFIG_KEYS = {
  showLogo: true,
  showNav: true,
  showSearch: true,
  showCta: true,
  sticky: true,
  ctaLabel: true,
  ctaHref: true,
  enabled: true,
  visibilityMode: true,
  pagePaths: true,
} as const satisfies Record<keyof HeaderThemeSettings, true>;

export const packageHeaderConfigSchema = z
  .object({
    showLogo: z.boolean(),
    showNav: z.boolean(),
    showSearch: z.boolean(),
    showCta: z.boolean(),
    sticky: z.boolean(),
    ctaLabel: z.string(),
    ctaHref: z.string(),
    enabled: z.boolean(),
    visibilityMode: chromeVisibilityMode,
    pagePaths: z.array(z.string()),
  })
  .strict();

export const PACKAGE_FOOTER_CONFIG_KEYS = {
  columns: true,
  showSocial: true,
  showQuickLinks: true,
  showContact: true,
  tagline: true,
  enabled: true,
  visibilityMode: true,
  pagePaths: true,
} as const satisfies Record<keyof FooterThemeSettings, true>;

export const packageFooterConfigSchema = z
  .object({
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    showSocial: z.boolean(),
    showQuickLinks: z.boolean(),
    showContact: z.boolean(),
    tagline: z.string(),
    enabled: z.boolean(),
    visibilityMode: chromeVisibilityMode,
    pagePaths: z.array(z.string()),
  })
  .strict();

/** Visual effect settings without schema defaults (intensity+opacity required). */
export type PackageVisualEffectSettings = {
  intensity: number;
  opacity: number;
  speed?: number;
  colors?: { primary?: string; accent?: string; secondary?: string };
};

export const PACKAGE_VISUAL_EFFECT_SETTINGS_KEYS = {
  intensity: true,
  opacity: true,
  speed: true,
  colors: true,
} as const satisfies Record<keyof PackageVisualEffectSettings, true>;

/** Ensure Studio VisualEffectSettings keys are covered (defaults strip optionality). */
export const PACKAGE_VISUAL_EFFECT_STUDIO_KEYS = {
  intensity: true,
  opacity: true,
  speed: true,
  colors: true,
} as const satisfies Record<keyof VisualEffectSettings, true>;

export const packageVisualEffectSettingsSchema = z
  .object({
    intensity: z.number().min(0.25).max(1.5),
    opacity: z.number().min(0.1).max(1),
    speed: z.number().min(0.25).max(2).optional(),
    colors: z
      .object({
        primary: z.string().optional(),
        accent: z.string().optional(),
        secondary: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const PACKAGE_MOTION_SETTINGS_KEYS = {
  intensity: true,
  opacity: true,
} as const satisfies Record<keyof MotionSettings, true>;

export const packageMotionSettingsSchema = z
  .object({
    intensity: z.number().min(0.25).max(1.5),
    opacity: z.number().min(0.1).max(1),
  })
  .strict();

/**
 * Complete mobile browser config for packages.
 * Matches Studio MobileBrowserConfig fields (anti-drift).
 */
export type PackageMobileBrowserConfig = {
  syncWithTheme: boolean;
  chromeTintSource: "surface" | "primary";
  chromeTintStyle: "transparent" | "glass" | "solid" | "gradient";
  chromeTintOpacity: number;
  chromeTintGlassOpacity: number;
  browserThemeColorLight: string | null;
  browserThemeColorDark: string | null;
  browserBackgroundColor: string | null;
  iosStatusBarStyle: "default" | "black" | "black-translucent";
  edgeToEdge: boolean;
};

export const PACKAGE_MOBILE_BROWSER_CONFIG_KEYS = {
  syncWithTheme: true,
  chromeTintSource: true,
  chromeTintStyle: true,
  chromeTintOpacity: true,
  chromeTintGlassOpacity: true,
  browserThemeColorLight: true,
  browserThemeColorDark: true,
  browserBackgroundColor: true,
  iosStatusBarStyle: true,
  edgeToEdge: true,
} as const satisfies Record<keyof PackageMobileBrowserConfig, true>;

/** Studio type may mark some fields optional — pin required package keys ⊆ Studio keys. */
type StudioMobileKeys = keyof MobileBrowserConfig;
export const PACKAGE_MOBILE_BROWSER_STUDIO_COVERAGE = {
  syncWithTheme: true,
  chromeTintSource: true,
  chromeTintStyle: true,
  chromeTintOpacity: true,
  chromeTintGlassOpacity: true,
  browserThemeColorLight: true,
  browserThemeColorDark: true,
  browserBackgroundColor: true,
  iosStatusBarStyle: true,
  edgeToEdge: true,
} as const satisfies Record<StudioMobileKeys, true>;

export const packageMobileBrowserConfigSchema = z
  .object({
    syncWithTheme: z.boolean(),
    chromeTintSource: z.enum(["surface", "primary"]),
    chromeTintStyle: z.enum(["transparent", "glass", "solid", "gradient"]),
    chromeTintOpacity: z.number().min(0).max(1),
    chromeTintGlassOpacity: z.number().min(0).max(1),
    browserThemeColorLight: z.string().nullable(),
    browserThemeColorDark: z.string().nullable(),
    browserBackgroundColor: z.string().nullable(),
    iosStatusBarStyle: z.enum(["default", "black", "black-translucent"]),
    edgeToEdge: z.boolean(),
  })
  .strict();

const ROOT_RELATIVE_OR_HTTPS =
  /^(\/(uploads|assets|images)\/[A-Za-z0-9._/-]*|https:\/\/[^\s]+)$/;

export function isAllowedBrandImageUrl(value: string): boolean {
  if (value === "") return true;
  if (/^(javascript:|data:|\/\/)/i.test(value.trim())) return false;
  return ROOT_RELATIVE_OR_HTTPS.test(value.trim());
}

export const PACKAGE_BRAND_LOGO_SIZING_KEYS = {
  mode: true,
  heightMobile: true,
  heightTablet: true,
  heightDesktop: true,
  adaptiveMin: true,
  adaptiveMax: true,
} as const satisfies Record<keyof BrandLogoSizing, true>;

const packageLogoSizingSchema = z
  .object({
    mode: z.enum(["fixed", "adaptive"]),
    heightMobile: z.number(),
    heightTablet: z.number(),
    heightDesktop: z.number(),
    adaptiveMin: z.number(),
    adaptiveMax: z.number(),
  })
  .strict();

export const PACKAGE_BRAND_NAME_TYPOGRAPHY_KEYS = {
  fontSource: true,
  customFont: true,
  sizeMobile: true,
  sizeDesktop: true,
  fontWeight: true,
} as const satisfies Record<keyof BrandNameTypography, true>;

const packageBrandNameTypographySchema = z
  .object({
    fontSource: z.enum(["heading", "body", "custom"]),
    customFont: z.string().optional(),
    sizeMobile: z.string(),
    sizeDesktop: z.string(),
    fontWeight: z.union([z.literal(600), z.literal(700), z.literal(800)]),
  })
  .strict();

export const PACKAGE_BRAND_TAGLINE_TYPOGRAPHY_KEYS = {
  fontSource: true,
  customFont: true,
  sizeMobile: true,
  sizeDesktop: true,
  fontWeight: true,
} as const satisfies Record<keyof BrandTaglineTypography, true>;

const packageBrandTaglineTypographySchema = z
  .object({
    fontSource: z.enum(["heading", "body", "custom"]),
    customFont: z.string().optional(),
    sizeMobile: z.string(),
    sizeDesktop: z.string(),
    fontWeight: z.union([z.literal(400), z.literal(500), z.literal(600)]),
  })
  .strict();

/** Required BrandingState keys (logoImageUrl optional). */
export const PACKAGE_BRAND_CONFIG_REQUIRED_KEYS = {
  logoMode: true,
  logoText: true,
  logoImageLightUrl: true,
  logoImageDarkUrl: true,
  brandName: true,
  tagline: true,
  showTagline: true,
  areaStyle: true,
  brandLayoutMobile: true,
  brandLayoutDesktop: true,
  logoSizing: true,
  brandNameTypography: true,
  brandTaglineTypography: true,
} as const satisfies Record<
  Exclude<keyof BrandingState, "logoImageUrl">,
  true
>;

export const packageBrandConfigSchema = z
  .object({
    logoMode: z.enum(["text", "image"]),
    logoText: z.string(),
    logoImageUrl: z.string().optional(),
    logoImageLightUrl: z.string(),
    logoImageDarkUrl: z.string(),
    brandName: z.string(),
    tagline: z.string(),
    showTagline: z.boolean(),
    areaStyle: z.enum(["default", "soft", "outline"]),
    brandLayoutMobile: z.enum(["logo-only", "text-only", "logo-and-text"]),
    brandLayoutDesktop: z.enum(["logo-only", "text-only", "logo-and-text"]),
    logoSizing: packageLogoSizingSchema,
    brandNameTypography: packageBrandNameTypographySchema,
    brandTaglineTypography: packageBrandTaglineTypographySchema,
  })
  .strict()
  .superRefine((val, ctx) => {
    for (const key of ["logoImageLightUrl", "logoImageDarkUrl", "logoImageUrl"] as const) {
      const v = val[key];
      if (v === undefined) continue;
      if (!isAllowedBrandImageUrl(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `brandConfig.${key} must be empty, root-relative /uploads|/assets|/images, or https`,
          path: [key],
        });
      }
    }
  });

export type PackageBrandConfig = z.infer<typeof packageBrandConfigSchema>;
export type PackageHeaderConfig = z.infer<typeof packageHeaderConfigSchema>;
export type PackageFooterConfig = z.infer<typeof packageFooterConfigSchema>;
