import {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_SHORT,
  DEFAULT_TAGLINE,
  getSeedCompanyEmail,
} from "@/config/site";
import { createDefaultFooterWorkspace } from "@/features/footer/defaults";
import { createDefaultWorkspace } from "@/features/navigation/defaults";

/** Default theme branding before any demo import or client customization. */
export function getFactoryBrandConfig() {
  return {
    brandName: DEFAULT_BRAND_NAME,
    tagline: DEFAULT_TAGLINE,
    logoMode: "text" as const,
    logoText: DEFAULT_BRAND_SHORT,
    showTagline: true,
  };
}

export function getFactoryHeaderConfig() {
  return {
    showLogo: true,
    showNav: true,
    showSearch: true,
    showCta: true,
    sticky: true,
    ctaLabelEn: "Contact",
    ctaLabelAr: "تواصل",
    ctaHref: "/contact",
  };
}

export function getFactoryFooterConfig() {
  return {
    columns: 3,
    showSocial: true,
    showQuickLinks: true,
    showContact: true,
    taglineEn: DEFAULT_TAGLINE,
    taglineAr: DEFAULT_TAGLINE,
  };
}

export function getFactoryCompanyInfoFields() {
  return {
    name: DEFAULT_BRAND_NAME,
    taglineEn: DEFAULT_TAGLINE,
    taglineAr: DEFAULT_TAGLINE,
    storyEn: "",
    storyAr: "",
    missionEn: "",
    missionAr: "",
    visionEn: "",
    visionAr: "",
    valuesEn: [] as string[],
    valuesAr: [] as string[],
    registrationNo: "",
    licenseInfo: "",
    addressEn: "",
    addressAr: "",
    phone: "",
    whatsapp: "",
    email: getSeedCompanyEmail(),
    officeHoursEn: "",
    officeHoursAr: "",
    socialLinks: {},
    trustBadges: [] as string[],
  };
}

export function getFactoryHeaderWorkspace() {
  return createDefaultWorkspace();
}

export function getFactoryFooterWorkspace() {
  return createDefaultFooterWorkspace();
}

export function getFactoryHeaderJsonFile() {
  const workspace = createDefaultWorkspace();
  return {
    version: workspace.version,
    menusDatabase: workspace.menusDatabase,
  };
}

export function getFactorySiteUiPatch() {
  return {
    siteName: DEFAULT_BRAND_NAME,
    tagline: DEFAULT_TAGLINE,
    logoText: DEFAULT_BRAND_SHORT,
    description: "",
  };
}
