import type { ResolvedSiteAnnouncementBar } from "@/features/announcement-bar/resolve-site-announcement-bar";
import { AnnouncementBarView } from "@/features/announcement-bar/announcement-bar-view";

type Props = {
  settings: ResolvedSiteAnnouncementBar;
  locale: string;
};

export function GlobalAnnouncementBar({ settings, locale }: Props) {
  if (!settings.enabled) return null;

  const { enabled: _enabled, suppressOnPagesWithBlock, dismissKey, ...barProps } = settings;

  return (
    <AnnouncementBarView
      {...barProps}
      locale={locale}
      barId="announcement-bar-global"
      dismissStorageKey={`${dismissKey}_closed`}
      suppressWhenPageHasBlock={suppressOnPagesWithBlock}
    />
  );
}
