"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { CompareItemSnapshot } from "@/features/comparison/types";
import { compareItemTitle } from "@/features/comparison/lib/compare-locale";
import { pickLocaleField } from "@/features/content-blocks/lib/locale-field";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  items: CompareItemSnapshot[];
  locale: string;
  title?: string;
  block: BlockNode;
  overflow: BlockOverflowContext;
};

const VIEW_LABELS = {
  viewEn: "View",
  viewAr: "عرض",
  viewDetailsEn: "View details",
  viewDetailsAr: "عرض التفاصيل",
} as const;

export function ComparisonCatalogOverflow({ items, locale, title, block, overflow }: Props) {
  const viewLabel = pickLocaleField(VIEW_LABELS, "view", locale);
  const viewDetailsLabel = pickLocaleField(VIEW_LABELS, "viewDetails", locale);

  return (
    <div className="cb-comparison cb-comparison--catalog-overflow">
      {title && <h2 className="font-heading text-2xl font-bold mb-6">{title}</h2>}
      <MarketingItemsOverflow
        block={block}
        overflowFlags={overflow.flags}
        previewDevice={overflow.previewDevice}
        items={items}
        columns={Math.min(items.length, 4) as 2 | 3 | 4}
        useSimpleSliderTrack
        gridClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        getItemKey={(item) => item.id}
        renderItem={(item) => {
          const name = compareItemTitle(item, locale);
          return (
            <article className="rounded-xl border p-5 min-w-[240px]">
              {item.imageUrl && (
                <div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-muted">
                  <Image src={item.imageUrl} alt={name} fill className="object-cover" sizes="300px" />
                </div>
              )}
              <h3 className="font-semibold text-lg">{name}</h3>
              {item.href && (
                <Link href={item.href} className="mt-3 inline-block text-sm text-primary hover:underline">
                  {viewLabel}
                </Link>
              )}
            </article>
          );
        }}
        accordionRender={(item) => ({
          title: compareItemTitle(item, locale),
          body: item.href ? (
            <Link href={item.href} className="text-sm text-primary hover:underline">
              {viewDetailsLabel}
            </Link>
          ) : (
            ""
          ),
        })}
      />
    </div>
  );
}
