"use client";

import { useMemo, useState } from "react";
import { SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import type { PublicLocale } from "@/i18n/locale-config";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import { normalizeFeatureGridProps } from "@/features/builder/blocks/marketing/lib/normalize-feature-grid";
import { FeatureGridCard } from "@/features/builder/blocks/marketing/components/feature-grid-card";
import type { FeatureGridItem } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  /** Raw block props — normalized internally for BC. */
  props?: Record<string, unknown>;
  /** @deprecated Prefer passing full props; kept for BC with block-renderer. */
  title?: string;
  subtitle?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  cardVariant?: "default" | "bordered" | "elevated" | "iconTop";
  showCategories?: boolean;
  items?: FeatureGridItem[];
  locale: string;
  enabledLocales?: PublicLocale[];
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

const desktopCol: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

const tabletCol: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

const mobileCol: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

function buildGridClass(
  columns: number,
  columnsTablet: number,
  columnsMobile: number,
  gapPx: number
): string {
  return cn(
    "grid",
    mobileCol[columnsMobile] ?? "grid-cols-1",
    tabletCol[columnsTablet] ?? "md:grid-cols-2",
    desktopCol[columns] ?? "lg:grid-cols-3"
  );
}

export function FeatureGridView({
  props: rawProps,
  title: titleProp,
  subtitle: subtitleProp,
  columns: columnsProp,
  cardVariant,
  showCategories: showCategoriesProp,
  items: itemsProp,
  locale,
  enabledLocales,
  block,
  overflow,
}: Props) {
  const mergedRaw = {
    ...(rawProps ?? {}),
    ...(titleProp !== undefined ? { title: titleProp } : {}),
    ...(subtitleProp !== undefined ? { subtitle: subtitleProp } : {}),
    ...(columnsProp !== undefined ? { columns: columnsProp } : {}),
    ...(cardVariant !== undefined ? { cardVariant } : {}),
    ...(showCategoriesProp !== undefined ? { showCategories: showCategoriesProp } : {}),
    ...(itemsProp !== undefined ? { items: itemsProp } : {}),
  };

  const cfg = normalizeFeatureGridProps(mergedRaw);
  const itemLocaleOptions = enabledLocales ? { enabledLocales } : undefined;

  const categories = useMemo(() => {
    if (!cfg.showCategories) return [];
    const set = new Set<string>();
    cfg.items.forEach((item) => {
      const cat = resolveItemField(item, "category", locale, itemLocaleOptions);
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [cfg.items, cfg.showCategories, locale, itemLocaleOptions]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? cfg.items.filter(
        (item) => resolveItemField(item, "category", locale, itemLocaleOptions) === activeCategory
      )
    : cfg.items;

  const gridClassName = buildGridClass(cfg.columns, cfg.columnsTablet, cfg.columnsMobile, cfg.gap);
  const gapStyle = { gap: `${cfg.gap}px` } as React.CSSProperties;

  const HeaderIcon = cfg.headerIcon ? resolveMarketingIcon(cfg.headerIcon) : null;

  const renderCard = (item: FeatureGridItem, index: number) => (
    <FeatureGridCard
      key={item.id}
      item={item}
      index={index}
      locale={locale}
      itemLocaleOptions={itemLocaleOptions}
      layout={cfg.layout}
      cardStyle={cfg.cardStyle}
      contentAlign={cfg.contentAlign}
      equalHeight={cfg.equalHeight}
      minCardHeight={cfg.minCardHeight}
      iconSize={cfg.iconSize}
      iconShape={cfg.iconShape}
      showAccentLine={cfg.showAccentLine}
      expandEnabled={cfg.expandEnabled}
      expandMode={cfg.expandMode}
      previewBy={cfg.previewBy}
      previewLimit={cfg.previewLimit}
      readMoreLabel={cfg.readMoreLabel}
      readLessLabel={cfg.readLessLabel}
      readMoreStyle={cfg.readMoreStyle}
      cardHoverEffect={cfg.cardHoverEffect}
      cardBackgroundColor={cfg.cardBackgroundColor}
      cardTextColor={cfg.cardTextColor}
      cardBorderColor={cfg.cardBorderColor}
      cardAccentColor={cfg.cardAccentColor}
      cardBorderRadius={cfg.cardBorderRadius}
      cardPadding={cfg.cardPadding}
    />
  );

  const useCarousel = cfg.layout === "carousel";
  const useOverflow = Boolean(block && overflow) || useCarousel;

  return (
    <AnimatedSection>
      {(cfg.title || cfg.eyebrow) && (
        <SectionHeader
          title={cfg.title}
          subtitle={cfg.subtitle || undefined}
          eyebrow={cfg.eyebrow || undefined}
          align={cfg.headerAlign === "left" ? "start" : cfg.headerAlign}
          showAccentLine={cfg.showAccentLine}
          ctaLabel={cfg.headerCtaLabel || undefined}
          ctaHref={cfg.headerCtaHref || undefined}
          headerImageUrl={cfg.headerImageUrl || undefined}
          headerIcon={HeaderIcon ? <HeaderIcon className="h-6 w-6" /> : undefined}
        />
      )}

      {cfg.showCategories && categories.length > 0 && (
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
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {useOverflow && block && overflow ? (
        <MarketingItemsOverflow
          block={block}
          overflowFlags={overflow.flags}
          previewDevice={overflow.previewDevice}
          items={filtered}
          columns={cfg.columns as 2 | 3 | 4}
          gridClassName={gridClassName}
          sliderItemClassName="h-full"
          useSimpleSliderTrack={false}
          getItemKey={(item: FeatureGridItem) => item.id}
          renderItem={(item: FeatureGridItem) =>
            renderCard(
              item,
              filtered.findIndex((i) => i.id === item.id)
            )
          }
          accordionRender={(item: FeatureGridItem) => {
            const itemTitle = resolveItemField(item, "title", locale, itemLocaleOptions);
            const desc = resolveItemField(item, "description", locale, itemLocaleOptions);
            return { title: itemTitle, body: desc };
          }}
        />
      ) : useCarousel ? (
        <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-6" style={{ minWidth: "min-content" }}>
            {filtered.map((item, index) => (
              <div
                key={item.id}
                className="w-[min(100%,320px)] shrink-0 sm:w-[300px]"
              >
                {renderCard(item, index)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={gridClassName} style={gapStyle}>
          {filtered.map((item, index) => renderCard(item, index))}
        </div>
      )}
    </AnimatedSection>
  );
}
