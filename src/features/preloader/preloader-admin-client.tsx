"use client";

import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { PreloaderAdminPanel } from "@/features/preloader/preloader-admin-panel";
import type { SitePreloaderSettings } from "@/features/preloader/site-preloader.schema";

type Props = {
  initialSettings: SitePreloaderSettings;
  themeLogoUrl: string | null;
  brandLogoLightUrl?: string | null;
  brandLogoDarkUrl?: string | null;
};

export function PreloaderAdminClient({
  initialSettings,
  themeLogoUrl,
  brandLogoLightUrl,
  brandLogoDarkUrl,
}: Props) {
  return (
    <DesignHubShell
      title="Preloader"
      description="Fullscreen loading overlay for the public site. Hides header, footer, and skeleton placeholders while content loads."
    >
      <PreloaderAdminPanel
        initialSettings={initialSettings}
        themeLogoUrl={themeLogoUrl}
        brandLogoLightUrl={brandLogoLightUrl}
        brandLogoDarkUrl={brandLogoDarkUrl}
      />
    </DesignHubShell>
  );
}
