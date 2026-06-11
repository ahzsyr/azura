"use client";

import { useStore } from "@nanostores/react";
import { $footerWorkspace } from "@/features/footer/footer-store";
import { resolveFooter } from "@/features/footer/resolve-footer";
import { FooterView } from "@/features/footer/components/footer-view";
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import type { SiteBrandConfig } from "@/types/site-identity";

type Props = {
  brandConfig?: SiteBrandConfig;
  company?: {
    phone: string;
    email: string;
    addressEn: string;
    addressAr: string;
    socialLinks?: Record<string, string> | unknown;
  } | null;
  locale?: string;
};

export function FooterPreviewPanel({
  brandConfig,
  company,
  locale = "en",
}: Props) {
  const workspace = useStore($footerWorkspace);
  const resolved = resolveFooter(workspace);

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/20">
      <FooterView
        resolved={resolved}
        locale={locale}
        brandConfig={brandConfig ?? normalizeBranding({})}
        company={company ?? null}
        compact
        rightsLabel="All rights reserved."
      />
    </div>
  );
}
