import {
  DEFAULT_SITE_ANNOUNCEMENT_BAR,
  parseSiteAnnouncementBarSettings,
  type SiteAnnouncementBarSettings,
} from "@/features/announcement-bar/site-announcement-bar.schema";

export type ResolvedSiteAnnouncementBar = SiteAnnouncementBarSettings;

export function resolveSiteAnnouncementBar(
  siteSettings: Record<string, unknown> | null | undefined,
): ResolvedSiteAnnouncementBar {
  const raw = siteSettings?.siteAnnouncementBar;
  if (!raw) return DEFAULT_SITE_ANNOUNCEMENT_BAR;
  return parseSiteAnnouncementBarSettings(raw);
}
