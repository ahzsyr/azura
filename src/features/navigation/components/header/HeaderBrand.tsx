"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { useTheme } from "next-themes";
import { defaultLocale } from "@/i18n/routing";
import { localePath } from "@/features/navigation/resolve-href";
import { DEFAULT_BRAND_SHORT } from "@/config/site";
import { brandingCssVariables } from "@/features/navigation/branding-defaults";
import type { BrandingState } from "@/features/navigation/types";

interface Props {
  branding: BrandingState;
  localeCode?: string;
}

export function HeaderBrand({ branding, localeCode = defaultLocale.code }: Props) {
  const lightUrl = branding.logoImageLightUrl || branding.logoImageUrl || "";
  const darkUrl = branding.logoImageDarkUrl || lightUrl;
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <Image
      src={activeLogoImage}
      alt=""
      width={120}
      height={40}
      priority
      sizes="120px"
      suppressHydrationWarning
    />
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
      <div className="brand-logo">{logoInner}</div>
      <div className="brand-text">
        <div className="brand-name">{brandName}</div>
        {branding.showTagline && branding.tagline ? (
          <div className="brand-tagline">{branding.tagline}</div>
        ) : null}
      </div>
    </a>
  );
}
