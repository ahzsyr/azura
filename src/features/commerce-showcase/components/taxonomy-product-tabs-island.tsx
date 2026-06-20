"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { BlockNode } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import { parseTaxonomyProductTabsProps } from "@/features/commerce-showcase/lib/parse-block-props";
import { ShowcaseSectionHeader } from "@/features/commerce-showcase/components/showcase-section-header";
import { ShowcaseProductPanel } from "@/features/commerce-showcase/components/showcase-product-panel";
import { TaxonomyTabsShell } from "@/features/commerce-showcase/components/taxonomy-tabs-shell";
import { useShowcaseTabFetch } from "@/features/commerce-showcase/hooks/use-showcase-tab-fetch";

type TabDef = {
  slug: string;
  label: string;
  count?: number;
  iconUrl?: string;
};

type Props = {
  locale: Locale;
  blockProps: Record<string, unknown>;
  tabs: TabDef[];
  initialTabSlug: string;
  initialRecords: ProductListingRecord[];
  initialTotal: number;
  taxonomy: "category" | "brand";
  block?: BlockNode;
  previewDevice?: DeviceBreakpoint;
};

export function TaxonomyProductTabsIsland({
  locale,
  blockProps: raw,
  tabs,
  initialTabSlug,
  initialRecords,
  initialTotal,
  taxonomy,
  block,
  previewDevice,
}: Props) {
  const p = parseTaxonomyProductTabsProps(raw);
  const [activeSlug, setActiveSlug] = useState(initialTabSlug);
  const [cachedRecords, setCachedRecords] = useState<Map<string, ProductListingRecord[]>>(
    () => new Map([[initialTabSlug, initialRecords]]),
  );

  const isInitialTab = activeSlug === initialTabSlug;
  const fetchState = useShowcaseTabFetch({
    locale,
    taxonomy,
    tabKey: activeSlug,
    limit: p.productsPerTab,
    sort: p.sortBy,
    enabled: p.ajaxEnabled && !isInitialTab,
    initialRecords: cachedRecords.get(activeSlug) ?? [],
    initialTotal: isInitialTab ? initialTotal : (cachedRecords.get(activeSlug)?.length ?? 0),
  });

  const records = isInitialTab ? initialRecords : fetchState.records;

  const handleTabChange = (slug: string) => {
    setActiveSlug(slug);
    if (!cachedRecords.has(slug) && slug === initialTabSlug) {
      setCachedRecords((prev) => new Map(prev).set(slug, initialRecords));
    }
  };

  useEffect(() => {
    if (!isInitialTab && fetchState.records.length > 0) {
      setCachedRecords((prev) => new Map(prev).set(activeSlug, fetchState.records));
    }
  }, [activeSlug, fetchState.records, isInitialTab]);

  const flags = block
    ? resolveContentOverflowCssFlags(block)
    : resolveContentOverflowCssFlags({ id: "taxonomy-tabs", type: "taxonomyProductTabs", props: raw });

  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);
  const emptyMessage = getLocalizedField(p, "emptyMessage", locale);

  const navTabs = tabs.map((t) => ({
    slug: t.slug,
    label: t.label,
    count: p.showTabCounts ? t.count : undefined,
    iconUrl: t.iconUrl,
  }));

  return (
    <div>
      <ShowcaseSectionHeader title={title} subtitle={subtitle} />
      <div className={title || subtitle ? "mt-6 space-y-6" : "space-y-6"}>
        <div className={p.navStyle === "vertical" ? "flex flex-col lg:flex-row gap-6" : undefined}>
          <TaxonomyTabsShell
            tabs={navTabs}
            activeSlug={activeSlug}
            onChange={handleTabChange}
            navStyle={p.navStyle}
            showCounts={p.showTabCounts}
          />
          <div className={p.navStyle === "vertical" ? "flex-1 min-w-0" : undefined}>
            <ShowcaseProductPanel
              records={records}
              localePrefix={locale}
              layout={p.productLayout}
              columns={p.columns}
              flags={flags}
              previewDevice={previewDevice}
              autoplay={p.autoplay}
              autoplayIntervalMs={p.autoplayIntervalMs}
              slidesPerView={p.slidesPerView}
              loading={!isInitialTab && fetchState.loading}
              emptyMessage={emptyMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
