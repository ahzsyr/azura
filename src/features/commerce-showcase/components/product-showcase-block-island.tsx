"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { BlockNode } from "@/types/builder";
import type { DeviceBreakpoint } from "@/types/block-system";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import { parseProductShowcaseProps } from "@/features/commerce-showcase/lib/parse-block-props";
import { ShowcaseSectionHeader } from "@/features/commerce-showcase/components/showcase-section-header";
import { ShowcaseProductPanel } from "@/features/commerce-showcase/components/showcase-product-panel";
import { TaxonomyTabsShell } from "@/features/commerce-showcase/components/taxonomy-tabs-shell";
import { useHydratedDiscoveryCards } from "@/features/discovery-blocks/hooks/use-hydrated-discovery-cards";
import { getRecentlyViewed } from "@/features/discovery-blocks/lib/recently-viewed.storage";
import type { DiscoveryItem } from "@/features/discovery-blocks/lib/recently-viewed.types";
import { SearchEntityType } from "@prisma/client";

type TabBundle = {
  id: string;
  label: string;
  records: ProductListingRecord[];
  source: string;
};

type Props = {
  locale: Locale;
  blockProps: Record<string, unknown>;
  initialRecords: ProductListingRecord[];
  tabBundles?: TabBundle[];
  block?: BlockNode;
  previewDevice?: DeviceBreakpoint;
};

export function ProductShowcaseBlockIsland({
  locale,
  blockProps: raw,
  initialRecords,
  tabBundles = [],
  block,
  previewDevice,
}: Props) {
  const p = parseProductShowcaseProps(raw);
  const [activeTabId, setActiveTabId] = useState(tabBundles[0]?.id ?? "");

  const flags = block
    ? resolveContentOverflowCssFlags(block)
    : resolveContentOverflowCssFlags({ id: "product-showcase", type: "productShowcase", props: raw });

  const isRecentlyViewed = p.mode === "single" && p.source === "recently_viewed";
  const recentItems = useMemo((): DiscoveryItem[] => {
    if (!isRecentlyViewed) return [];
    return getRecentlyViewed(locale, p.limit, [SearchEntityType.CATALOG_PRODUCT]).map((e) => ({
      id: `${e.entityType}-${e.entityId}`,
      entityType: e.entityType,
      entityId: e.entityId,
      title: e.title,
      urlPath: e.urlPath,
      imageUrl: e.imageUrl,
    }));
  }, [isRecentlyViewed, locale, p.limit]);

  const hydratedRecent = useHydratedDiscoveryCards(locale, recentItems);
  const recentRecords = useMemo(
    () => hydratedRecent.filter((h) => h.isProduct).map((h) => h.record),
    [hydratedRecent],
  );

  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);
  const badge = getLocalizedField(p, "badge", locale);
  const emptyMessage = getLocalizedField(p, "emptyMessage", locale);

  const activeRecords =
    p.mode === "tabs"
      ? tabBundles.find((t) => t.id === activeTabId)?.records ?? tabBundles[0]?.records ?? []
      : isRecentlyViewed
        ? recentRecords
        : initialRecords;

  const tabNav = tabBundles.map((t) => ({ slug: t.id, label: t.label }));

  return (
    <div>
      <ShowcaseSectionHeader
        title={title}
        subtitle={subtitle}
        badge={badge}
        viewAllHref={p.viewAllHref || undefined}
      />
      <div className={title || subtitle ? "mt-6 space-y-6" : "space-y-6"}>
        {p.mode === "tabs" && tabNav.length > 1 ? (
          <TaxonomyTabsShell
            tabs={tabNav}
            activeSlug={activeTabId || tabNav[0]?.slug}
            onChange={setActiveTabId}
            navStyle="pills"
            showCounts={false}
          />
        ) : null}
        <ShowcaseProductPanel
          records={activeRecords}
          localePrefix={locale}
          layout={p.layout}
          columns={p.columns}
          flags={flags}
          previewDevice={previewDevice}
          autoplay={p.autoplay}
          autoplayIntervalMs={p.autoplayIntervalMs}
          slidesPerView={p.slidesPerView}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}
