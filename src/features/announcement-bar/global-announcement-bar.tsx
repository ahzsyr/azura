import type { ResolvedSiteAnnouncementBar } from "@/features/announcement-bar/resolve-site-announcement-bar";
import { AnnouncementBarView } from "@/features/announcement-bar/announcement-bar-view";
import type { PublicLocale } from "@/i18n/locale-config";

type Props = {
  settings: ResolvedSiteAnnouncementBar;
  locale: string;
  enabledLocales?: PublicLocale[];
};

export function GlobalAnnouncementBar({ settings, locale, enabledLocales }: Props) {
  if (!settings.enabled) return null;

  const { enabled: _enabled, suppressOnPagesWithBlock, dismissKey, ...barProps } = settings;

  return (
    <AnnouncementBarView
      {...barProps}
      locale={locale}
      enabledLocales={enabledLocales}
      barId="announcement-bar-global"
      dismissStorageKey={`${dismissKey}_closed`}
      suppressWhenPageHasBlock={suppressOnPagesWithBlock}
    />
  );
}
