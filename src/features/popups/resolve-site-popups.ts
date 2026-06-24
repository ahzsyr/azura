import {
  DEFAULT_SITE_POPUPS,
  parseSitePopupsSettings,
  type SitePopupsSettings,
} from "@/features/popups/site-popups.schema";
import type { PopupItem } from "@/features/popups/popup.schema";

export type ResolvedSitePopups = SitePopupsSettings & {
  activeItems: PopupItem[];
};

export function resolveSitePopups(
  siteSettings: Record<string, unknown> | null | undefined,
): ResolvedSitePopups {
  const raw = siteSettings?.sitePopups;
  const settings = raw ? parseSitePopupsSettings(raw) : DEFAULT_SITE_POPUPS;

  const activeItems = settings.enabled
    ? settings.items.filter((item) => item.enabled)
    : [];

  return {
    ...settings,
    activeItems,
  };
}
