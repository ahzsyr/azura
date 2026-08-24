"use client";

import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { AnnouncementBarAdminPanel } from "@/features/announcement-bar/announcement-bar-admin-panel";
import type { SiteAnnouncementBarSettings } from "@/features/announcement-bar/site-announcement-bar.schema";

type Props = {
  initialSettings: SiteAnnouncementBarSettings;
};

export function AnnouncementBarAdminClient({ initialSettings }: Props) {
  return (
    <DesignHubShell
      title="Announcement Bar"
      description="Site-wide scrolling announcement strip shown above the header on every page. Page-level announcementBar blocks can override this when suppress is enabled."
    >
      <AnnouncementBarAdminPanel initialSettings={initialSettings} />
    </DesignHubShell>
  );
}
