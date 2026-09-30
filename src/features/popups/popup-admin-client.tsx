"use client";

import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { PopupManager } from "@/features/popups/admin/PopupManager";
import type { SitePopupsSettings } from "@/features/popups/site-popups.schema";

type Props = {
  initialSettings: SitePopupsSettings;
};

export function PopupAdminClient({ initialSettings }: Props) {
  return (
    <DesignHubShell
      title="Popup Management"
      description="Create announcements, promotions, and campaigns with targeting, styling, and trigger controls."
    >
      <PopupManager initialSettings={initialSettings} />
    </DesignHubShell>
  );
}
