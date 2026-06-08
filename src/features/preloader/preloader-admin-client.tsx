"use client";

import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { PreloaderAdminPanel } from "@/features/preloader/preloader-admin-panel";
import type { SitePreloaderSettings } from "@/features/preloader/site-preloader.schema";

type Props = {
  initialSettings: SitePreloaderSettings;
  themeLogoUrl: string | null;
};

export function PreloaderAdminClient({ initialSettings, themeLogoUrl }: Props) {
  return (
    <DesignHubShell
      title="Preloader"
      description="Fullscreen loading overlay for the public site. Hides header, footer, and skeleton placeholders while content loads."
    >
      <PreloaderAdminPanel initialSettings={initialSettings} themeLogoUrl={themeLogoUrl} />
    </DesignHubShell>
  );
}
