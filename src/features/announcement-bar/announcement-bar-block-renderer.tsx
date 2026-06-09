import "server-only";

import { announcementBarPropsSchema } from "@/features/announcement-bar/announcement-bar.schema";
import { AnnouncementBarView } from "@/features/announcement-bar/announcement-bar-view";

type RenderCtx = {
  locale: string;
  props: Record<string, unknown>;
  blockId?: string;
};

export async function AnnouncementBarBlockRenderer({ locale, props, blockId }: RenderCtx) {
  const p = announcementBarPropsSchema.parse(props);
  return (
    <AnnouncementBarView
      {...p}
      locale={locale}
      barId={blockId ? `announcement-bar-${blockId}` : undefined}
      dismissStorageKey={blockId ? `announcement-bar-${blockId}_closed` : undefined}
    />
  );
}
