"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTheme } from "next-themes";
import { useVisualExperience } from "@/components/theme/visual-experience-context";
import { defaultLocale } from "@/i18n/routing";
import { localePath } from "@/features/navigation/resolve-href";
import { DEFAULT_BRAND_SHORT } from "@/config/site";
import { brandingCssVariables } from "@/features/navigation/branding-defaults";
import { siteHeroHeadingAttrs } from "@/features/theme/hero-heading-attrs";
import { useTextEffectRescan } from "@/features/theme/use-text-effect-rescan";
import { BrandLogoImage } from "@/features/navigation/components/header/brand-logo-image";
import { THEME_CHANGE_EVENT } from "@/features/theme/engine/constants";
import { readStoredPresetEffects } from "@/features/theme/engine";
import type { BrandingState } from "@/features/navigation/types";

interface Props {
  branding: BrandingState;
  localeCode?: string;
  /** Override site text effect (e.g. theme studio preview without VisualExperienceProvider). */
  siteTextEffect?: string | null;
}

function normalizeTextEffect(value: string | null | undefined): string | null {
  if (!value || value === "none") return null;
  return value;
}

function readLiveTextEffect(): string | null {
  if (typeof document === "undefined") return null;
  const fromDom = normalizeTextEffect(document.documentElement.dataset.textEffectTheme);
  if (fromDom) return fromDom;
  try {
    return normalizeTextEffect(readStoredPresetEffects()?.textEffect);
  } catch {
    return null;
  }
}

export function HeaderBrand({ branding, localeCode = defaultLocale.code, siteTextEffect }: Props) {
  const lightUrl = branding.logoImageLightUrl || branding.logoImageUrl || "";
  const darkUrl = branding.logoImageDarkUrl || lightUrl;
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const experience = useVisualExperience();
  const [visitorTextEffect, setVisitorTextEffect] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const sync = () => setVisitorTextEffect(readLiveTextEffect());
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  // Prefer explicit override → live visitor preset effect → site experience.
  const textEffect =
    siteTextEffect !== undefined
      ? normalizeTextEffect(siteTextEffect)
      : (visitorTextEffect ??
        normalizeTextEffect(experience?.resolved.textEffect) ??
        null);

  const brandTextEffectAttrs = siteHeroHeadingAttrs(textEffect);
  const brandTextEffectProps = {
    "data-text-effect-target": "brand" as const,
    ...brandTextEffectAttrs,
  };

  useTextEffectRescan(textEffect, experience?.resolved.animationsEnabled !== false);

  const activeLogoImage =
    mounted && resolvedTheme === "dark" ? darkUrl || lightUrl : lightUrl || darkUrl;

  const areaClass =
    branding.areaStyle === "soft"
      ? "logo-area-soft"
      : branding.areaStyle === "outline"
        ? "logo-area-outline"
        : "";

  const hasImage = branding.logoMode === "image" && activeLogoImage;
  const logoInner = hasImage ? (
    <BrandLogoImage src={activeLogoImage} width={120} height={40} priority tintWithPrimary />
  ) : (
    (branding.logoText || "").trim() || DEFAULT_BRAND_SHORT
  );

  const homeHref = localePath("/", localeCode);
  const brandName = (branding.brandName ?? "").trim();
  const layoutMobile = branding.brandLayoutMobile ?? "logo-and-text";
  const layoutDesktop = branding.brandLayoutDesktop ?? "logo-and-text";
  const logoSizingMode = branding.logoSizing?.mode ?? "fixed";

  return (
    <a
      href={homeHref}
      className={`logo-area ${areaClass}`.trim()}
      data-brand-mobile={layoutMobile}
      data-brand-desktop={layoutDesktop}
      data-logo-sizing-mode={logoSizingMode}
      style={brandingCssVariables(branding) as CSSProperties}
      aria-label={`${brandName || "Home"} — Home`}
    >
      <div className="brand-logo" {...(!hasImage ? brandTextEffectProps : undefined)}>
        {logoInner}
      </div>
      <div className="brand-text">
        <div className="brand-name" {...brandTextEffectProps}>
          {brandName}
        </div>
        {branding.showTagline && branding.tagline ? (
          <div className="brand-tagline">{branding.tagline}</div>
        ) : null}
      </div>
    </a>
  );
}
