"use client";

import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { PopupAdminPanel } from "@/features/popups/popup-admin-panel";
import type { SitePopupsSettings } from "@/features/popups/site-popups.schema";

type Props = {
  initialSettings: SitePopupsSettings;
};

export function PopupAdminClient({ initialSettings }: Props) {
  return (
    <DesignHubShell
      title="Popup Management"
      description="Manage floating buttons, modal popups, slide-in panels, and promotional announcements with full targeting, styling, and trigger controls."
    >
      <PopupAdminPanel initialSettings={initialSettings} />
    </DesignHubShell>
  );
}
