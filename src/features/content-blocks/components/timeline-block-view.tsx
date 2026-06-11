import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocaleArrayField } from "@/features/content-blocks/lib/locale-field";
import type { timelineLayoutSchema, timelineItemSchema } from "@/features/content-blocks/schemas/content-blocks";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { TimelineItemsOverflow } from "@/features/content-blocks/components/timeline-items-overflow";
import type { z } from "zod";

type TimelineItem = z.infer<typeof timelineItemSchema>;
type TimelineLayout = z.infer<typeof timelineLayoutSchema>;

type Props = {
  title?: string;
  layout: TimelineLayout;
  items: TimelineItem[];
  locale: Locale;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export function TimelineBlockView({
  title,
  layout,
  items,
  locale,
  block,
  overflow,
}: Props) {
  if (items.length === 0) return null;

  return (
    <div className="cb-timeline">
      {title && (
        <h2 className="font-heading text-2xl font-bold text-foreground mb-8" data-text-effect-target="heading">
          {title}
        </h2>
      )}
      {block && overflow && (layout === "horizontal" || layout === "vertical") ? (
        <TimelineItemsOverflow
          items={items}
          locale={locale}
          flags={overflow.flags}
          previewDevice={overflow.previewDevice}
        />
      ) : null}
      <ol
        className={cn(
          "cb-timeline__list",
          block && overflow && (layout === "horizontal" || layout === "vertical") && "hidden",
          layout === "horizontal" &&
            !(block && overflow) &&
            "cb-timeline__list--horizontal flex gap-6 overflow-x-auto pb-4",
          layout === "alternating" && "cb-timeline__list--alternating",
          layout === "vertical" &&
            !(block && overflow) &&
            "cb-timeline__list--vertical space-y-8 border-s border-border ps-6"
        )}
      >
        {items.map((item) => {
          const itemTitle = pickLocaleArrayField(item, "title", locale);
          const description = pickLocaleArrayField(item, "description", locale);
          const category = pickLocaleArrayField(item, "category", locale);
          return (
            <li key={item.id} className="cb-timeline__item relative">
              {layout === "vertical" && (
                <span className="absolute -start-[1.65rem] top-1 size-3 rounded-full bg-primary border-2 border-background" />
              )}
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
            </li>
          );
        })}
      </ol>
    </div>
  );
}
