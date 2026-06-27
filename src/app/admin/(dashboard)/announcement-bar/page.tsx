import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { AnnouncementBarAdminClient } from "@/features/announcement-bar/announcement-bar-admin-client";
import { resolveSiteAnnouncementBar } from "@/features/announcement-bar/resolve-site-announcement-bar";

export const metadata = {
  title: "Announcement Bar",
};

export default async function AnnouncementBarAdminPage() {
  const siteSettings = await readSiteSettings();
  const settings = resolveSiteAnnouncementBar(siteSettings);

  return (
    <AnnouncementBarAdminClient initialSettings={settings} />
  );
}
