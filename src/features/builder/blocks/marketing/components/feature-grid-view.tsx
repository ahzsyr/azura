"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import type { PublicLocale } from "@/i18n/locale-config";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import type { GridItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4;
  cardVariant?: "default" | "bordered" | "elevated" | "iconTop";
  showCategories?: boolean;
  items: GridItem[];
  locale: string;
  enabledLocales?: PublicLocale[];
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

const columnClasses = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

const cardClasses = {
  default: "rounded-xl border border-border/60 p-6 bg-card",
  bordered: "rounded-xl border-2 border-primary/20 p-6",
  elevated: "rounded-xl border border-border/40 p-6 bg-card shadow-md",
  iconTop: "rounded-xl border border-border/60 p-6 bg-card text-center",
};

export function FeatureGridView({
  title,
  subtitle,
  columns = 3,
  cardVariant = "default",
  showCategories = false,
  items,
  locale,
  enabledLocales,
  block,
  overflow,
}: Props) {
  const itemLocaleOptions = enabledLocales ? { enabledLocales } : undefined;
  const categories = useMemo(() => {
    if (!showCategories) return [];
    const set = new Set<string>();
    items.forEach((item) => {
      const cat = resolveItemField(item, "category", locale, itemLocaleOptions);
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [items, locale, showCategories]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? items.filter((item) => resolveItemField(item, "category", locale, itemLocaleOptions) === activeCategory)
    : items;

  return (
    <AnimatedSection>
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      {showCategories && categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition",
              !activeCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition",
                activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      {block && overflow ? (
        (() => {
          const renderCard = (item: GridItem) => {
            const Icon = resolveMarketingIcon(item.icon);
            const itemTitle = resolveItemField(item, "title", locale, itemLocaleOptions);
            const desc = resolveItemField(item, "description", locale, itemLocaleOptions);
            const linkLabel = resolveItemField(item, "linkLabel", locale, itemLocaleOptions);
            return (
              <div className={cardClasses[cardVariant]}>
                {item.imageUrl ? (
                  <div className="relative mb-4 h-12 w-12 overflow-hidden rounded-lg">
                    <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                  </div>
                ) : item.icon ? (
                  <div
                    className={cn(
                      "mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary",
                      cardVariant === "iconTop" && "mx-auto"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                ) : null}
                <h3 className="font-heading text-lg font-semibold text-card-foreground">{itemTitle}</h3>
                <div className="gold-divider my-3" />
                <p className="text-sm leading-relaxed text-card-foreground/75">{desc}</p>
                {item.href && linkLabel && (
                  <Link href={item.href} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                    {linkLabel}
                  </Link>
                )}
              </div>
            );
          };
          return (
            <MarketingItemsOverflow
              block={block}
              overflowFlags={overflow.flags}
              previewDevice={overflow.previewDevice}
              items={filtered}
              columns={columns}
              gridClassName={columnClasses[columns]}
              getItemKey={(item: GridItem) => item.id}
              renderItem={renderCard}
              accordionRender={(item: GridItem) => {
                const itemTitle = resolveItemField(item, "title", locale, itemLocaleOptions);
                const desc = resolveItemField(item, "description", locale, itemLocaleOptions);
                return { title: itemTitle, body: desc };
              }}
            />
          );
        })()
      ) : (
        <div className={cn("grid gap-6", columnClasses[columns])}>
          {filtered.map((item) => {
            const Icon = resolveMarketingIcon(item.icon);
            const itemTitle = resolveItemField(item, "title", locale, itemLocaleOptions);
            const desc = resolveItemField(item, "description", locale, itemLocaleOptions);
            const linkLabel = resolveItemField(item, "linkLabel", locale, itemLocaleOptions);
            return (
              <div key={item.id} className={cardClasses[cardVariant]}>
                {item.imageUrl ? (
                  <div className="relative mb-4 h-12 w-12 overflow-hidden rounded-lg">
                    <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                  </div>
                ) : item.icon ? (
                  <div
                    className={cn(
                      "mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary",
                      cardVariant === "iconTop" && "mx-auto"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                ) : null}
                <h3 className="font-heading text-lg font-semibold text-card-foreground">{itemTitle}</h3>
                <div className="gold-divider my-3" />
                <p className="text-sm leading-relaxed text-card-foreground/75">{desc}</p>
                {item.href && linkLabel && (
                  <Link href={item.href} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                    {linkLabel}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AnimatedSection>
  );
}
