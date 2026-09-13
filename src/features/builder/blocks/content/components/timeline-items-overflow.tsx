"use client";

import Image from "next/image";
import type { Locale } from "@/i18n/routing";
import { pickLocaleArrayField } from "@/features/builder/blocks/content/lib/locale-field";
import type { timelineItemSchema } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import {
  ResponsiveOverflowLayout,
  ResponsiveOverflowLayoutForDevice,
} from "@/features/builder/components/responsive-overflow-layout";
import type { z } from "zod";

type TimelineItem = z.infer<typeof timelineItemSchema>;

type Props = {
  items: TimelineItem[];
  locale: Locale;
  flags: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  previewDevice?: DeviceBreakpoint;
};

export function TimelineItemsOverflow({ items, locale, flags, previewDevice }: Props) {
  const renderItem = (item: TimelineItem) => {
    const itemTitle = pickLocaleArrayField(item, "title", locale);
    const description = pickLocaleArrayField(item, "description", locale);
    const category = pickLocaleArrayField(item, "category", locale);
    return (
      <div className="cb-timeline__item relative min-w-[240px]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
          {item.date && <time dateTime={item.date}>{item.date}</time>}
          {category && <span className="rounded-full bg-muted px-2 py-0.5">{category}</span>}
          {item.icon && <span aria-hidden>{item.icon}</span>}
        </div>
        {itemTitle && <h3 className="font-semibold text-lg text-foreground">{itemTitle}</h3>}
        {description && <p className="mt-1 text-foreground/70">{description}</p>}
        {item.imageUrl && (
          <div className="relative mt-3 aspect-video max-w-md overflow-hidden rounded-lg">
            <Image src={item.imageUrl} alt="" fill className="object-cover" />
          </div>
        )}
      </div>
    );
  };

  const layoutProps = {
    items,
    flags,
    useSimpleSliderTrack: false,
    getItemKey: (item: TimelineItem) => item.id,
    renderItem,
    accordionRender: (item: TimelineItem) => {
      const itemTitle = pickLocaleArrayField(item, "title", locale);
      const description = pickLocaleArrayField(item, "description", locale);
      return { title: itemTitle ?? item.id, body: description };
    },
  };

  if (previewDevice) {
    return <ResponsiveOverflowLayoutForDevice {...layoutProps} device={previewDevice} />;
  }
  return <ResponsiveOverflowLayout {...layoutProps} />;
}
