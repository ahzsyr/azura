"use client";

import type { SiteBrandConfig } from "@/types/site-identity";
import { BrandingPanel } from "@/features/navigation/admin/BrandingPanel";

type Props = {
  brandConfig: SiteBrandConfig;
  onChange: (brandConfig: SiteBrandConfig) => void;
};

export function SiteIdentityPanel({ brandConfig, onChange }: Props) {
  return (
    <BrandingPanel
      branding={brandConfig}
      brandingSourceReady
      onChange={onChange}
      description="Logo, brand name, and tagline for the site header. Saved with the theme draft and published to the live site."
    />
  );
}
