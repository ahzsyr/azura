import "server-only";

import type { PublicLocale } from "@/i18n/locale-config";
import { announcementBarPropsSchema } from "@/features/announcement-bar/announcement-bar.schema";
import { AnnouncementBarView } from "@/features/announcement-bar/announcement-bar-view";

type RenderCtx = {
  locale: string;
  enabledLocales?: PublicLocale[];
  props: Record<string, unknown>;
  blockId?: string;
};

export async function AnnouncementBarBlockRenderer({
  locale,
  enabledLocales,
  props,
  blockId,
}: RenderCtx) {
  const parsed = announcementBarPropsSchema.safeParse(props);
  if (!parsed.success) {
    console.error("[AnnouncementBarBlockRenderer] invalid props:", parsed.error.message);
    return null;
  }
  const p = parsed.data;
  return (
    <AnnouncementBarView
      {...p}
      locale={locale}
      enabledLocales={enabledLocales}
      barId={blockId ? `announcement-bar-${blockId}` : undefined}
      dismissStorageKey={blockId ? `announcement-bar-${blockId}_closed` : undefined}
    />
  );
}
