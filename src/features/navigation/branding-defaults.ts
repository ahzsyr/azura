import {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_SHORT,
  DEFAULT_TAGLINE,
} from "@/config/site";
import type {
  BrandingState,
  BrandLogoSizing,
  BrandNameTypography,
  BrandTaglineTypography,
} from "./types";

export const DEFAULT_LOGO_SIZING: BrandLogoSizing = {
  mode: "fixed",
  heightMobile: 32,
  heightTablet: 36,
  heightDesktop: 42,
  adaptiveMin: 28,
  adaptiveMax: 48,
};

export const DEFAULT_BRAND_NAME_TYPOGRAPHY: BrandNameTypography = {
  fontSource: "heading",
  customFont: "",
  sizeMobile: "1rem",
  sizeDesktop: "1.2rem",
  fontWeight: 800,
};

export const DEFAULT_BRAND_TAGLINE_TYPOGRAPHY: BrandTaglineTypography = {
  fontSource: "body",
  customFont: "",
  sizeMobile: "0.65rem",
  sizeDesktop: "0.72rem",
  fontWeight: 400,
};

export const BRAND_NAME_SIZE_OPTIONS = [
  "0.875rem",
  "1rem",
  "1.125rem",
  "1.2rem",
  "1.25rem",
  "1.5rem",
] as const;

export const BRAND_TAGLINE_SIZE_OPTIONS = [
  "0.6rem",
  "0.65rem",
  "0.72rem",
  "0.75rem",
  "0.875rem",
] as const;

export function resolveBrandFontFamily(
  fontSource: BrandNameTypography["fontSource"] | BrandTaglineTypography["fontSource"],
  customFont?: string
): string {
  if (fontSource === "custom" && customFont?.trim()) {
    return `"${customFont.trim()}", system-ui, sans-serif`;
  }
  if (fontSource === "heading") {
    return "var(--font-heading, var(--font-display, system-ui, sans-serif))";
  }
  return "var(--font-body, system-ui, sans-serif)";
}

type BrandingInput = Partial<BrandingState> & { name?: string; shortName?: string };

export function normalizeBranding(
  partial: BrandingInput,
  base?: BrandingState
): BrandingState {
  const raw = partial as Record<string, unknown>;
  const mapped: Partial<BrandingState> = { ...partial };
  const aliasName = typeof raw.name === "string" ? raw.name.trim() : "";
  const aliasShort = typeof raw.shortName === "string" ? raw.shortName.trim() : "";
  if (!mapped.brandName?.trim() && aliasName) mapped.brandName = aliasName;
  if (!mapped.logoText?.trim() && aliasShort) mapped.logoText = aliasShort;

  const defaults: BrandingState = base ?? {
    logoMode: "text",
    logoText: DEFAULT_BRAND_SHORT,
    logoImageLightUrl: "",
    logoImageDarkUrl: "",
    brandName: DEFAULT_BRAND_NAME,
    tagline: DEFAULT_TAGLINE,
    showTagline: true,
    areaStyle: "default",
    brandLayoutMobile: "logo-and-text",
    brandLayoutDesktop: "logo-and-text",
    logoSizing: { ...DEFAULT_LOGO_SIZING },
    brandNameTypography: { ...DEFAULT_BRAND_NAME_TYPOGRAPHY },
    brandTaglineTypography: { ...DEFAULT_BRAND_TAGLINE_TYPOGRAPHY },
  };

  const logoSizing = {
    ...defaults.logoSizing,
    ...(partial.logoSizing ?? {}),
  };

  const brandNameTypography = {
    ...defaults.brandNameTypography,
    ...(partial.brandNameTypography ?? {}),
  };

  const brandTaglineTypography = {
    ...defaults.brandTaglineTypography,
    ...(partial.brandTaglineTypography ?? {}),
  };

  return {
    ...defaults,
    ...mapped,
    logoSizing,
    brandNameTypography,
    brandTaglineTypography,
    brandLayoutMobile: mapped.brandLayoutMobile ?? defaults.brandLayoutMobile,
    brandLayoutDesktop: mapped.brandLayoutDesktop ?? defaults.brandLayoutDesktop,
  };
}

export function brandingCssVariables(branding: BrandingState): Record<string, string> {
  const sizing = branding.logoSizing ?? DEFAULT_LOGO_SIZING;
  const nameTypo = branding.brandNameTypography ?? DEFAULT_BRAND_NAME_TYPOGRAPHY;
  const tagTypo = branding.brandTaglineTypography ?? DEFAULT_BRAND_TAGLINE_TYPOGRAPHY;

  return {
    "--brand-logo-h-mobile": `${sizing.heightMobile}px`,
    "--brand-logo-h-tablet": `${sizing.heightTablet}px`,
    "--brand-logo-h-desktop": `${sizing.heightDesktop}px`,
    "--brand-logo-adaptive-min": `${sizing.adaptiveMin}px`,
    "--brand-logo-adaptive-max": `${sizing.adaptiveMax}px`,
    "--brand-name-size-mobile": nameTypo.sizeMobile,
    "--brand-name-size-desktop": nameTypo.sizeDesktop,
    "--brand-name-font-weight": String(nameTypo.fontWeight),
    "--brand-name-font": resolveBrandFontFamily(nameTypo.fontSource, nameTypo.customFont),
    "--brand-tagline-size-mobile": tagTypo.sizeMobile,
    "--brand-tagline-size-desktop": tagTypo.sizeDesktop,
    "--brand-tagline-font-weight": String(tagTypo.fontWeight),
    "--brand-tagline-font": resolveBrandFontFamily(tagTypo.fontSource, tagTypo.customFont),
  };
}
