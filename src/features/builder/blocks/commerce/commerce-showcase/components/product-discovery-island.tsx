"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import type { ListingFacets, ListingFilterState, ProductListingRecord } from "@/features/products/listing/types";
import { useCatalogListingFetch } from "@/features/products/listing/use-catalog-listing-fetch";
import { filterListingCatalog, paginateListing } from "@/features/products/listing/filter";
import { coerceListingPerPage } from "@/features/builder/blocks/commerce/commerce-showcase/lib/coerce-listing-per-page";
import { parseProductDiscoveryProps } from "@/features/builder/blocks/commerce/commerce-showcase/lib/parse-block-props";
import { ShowcaseSectionHeader } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-section-header";
import { ShowcaseProductPanel } from "@/features/builder/blocks/commerce/commerce-showcase/components/showcase-product-panel";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CatalogContentLayout } from "@/features/catalog/components/catalog-content-layout";
import { getDirection } from "@/i18n/routing";

type Props = {
  locale: Locale;
  blockProps: Record<string, unknown>;
  initialRecords: ProductListingRecord[];
  initialFacets: ListingFacets;
  initialTotal: number;
  initialTotalPages: number;
  collectionSlug?: string;
};

export function ProductDiscoveryIsland({
  locale,
  blockProps: raw,
  initialRecords,
  initialFacets,
  initialTotal,
  initialTotalPages,
  collectionSlug,
}: Props) {
  const p = parseProductDiscoveryProps(raw);
  const dir = getDirection(locale);
  const perPage = coerceListingPerPage(p.pageSize);
  const [filterState, setFilterState] = useState<ListingFilterState>({
    q: "",
    categories: [],
    brands: [],
    collections: collectionSlug ? [collectionSlug] : [],
    collectionScope: collectionSlug ?? "",
    tags: [],
    conditions: [],
    variations: {},
    priceMin: null,
    priceMax: null,
    stockOnly: false,
    page: 1,
    per: perPage,
  });

  const fetchState = useCatalogListingFetch({
    locale,
    filterState,
    listingMode: "product",
    collectionSlug: collectionSlug ?? null,
    enabled: p.ajaxEnabled,
    initialRecords,
    initialFacets,
    initialTotal,
    initialTotalPages,
  });

  const clientFiltered = useMemo(() => {
    if (p.ajaxEnabled) return fetchState.records;
    const filtered = filterListingCatalog(initialRecords, filterState);
    return paginateListing(filtered, filterState.page, filterState.per).items;
  }, [p.ajaxEnabled, fetchState.records, initialRecords, filterState]);

  const records = clientFiltered;
  const total = p.ajaxEnabled ? fetchState.total : filterListingCatalog(initialRecords, filterState).length;
  const flags = resolveContentOverflowCssFlags({
    id: "product-discovery",
    type: "productDiscovery",
    props: raw,
  });

  const title = getLocalizedField(p, "title", locale);
  const subtitle = getLocalizedField(p, "subtitle", locale);
  const emptyMessage = getLocalizedField(p, "emptyMessage", locale);

  const toggleBrand = (brand: string) => {
    setFilterState((s) => ({
      ...s,
      brands: s.brands.includes(brand) ? s.brands.filter((b) => b !== brand) : [...s.brands, brand],
      page: 1,
    }));
  };

  const toggleCategory = (cat: string) => {
    setFilterState((s) => ({
      ...s,
      categories: s.categories.includes(cat) ? s.categories.filter((c) => c !== cat) : [...s.categories, cat],
      page: 1,
    }));
  };

  const facets = p.ajaxEnabled ? fetchState.facets : initialFacets;
  const showBrands = p.enabledDimensions.includes("brands");
  const showCategories = p.enabledDimensions.includes("categories");
  const filters = (showBrands || showCategories) ? (
    <aside className="catalog-content-layout__filters">
      <div className="flex flex-wrap gap-2">
        {showCategories &&
          facets.categories.slice(0, 8).map((c) => (
            <Button
              key={c.value}
              type="button"
              size="sm"
              variant={filterState.categories.includes(c.value) ? "default" : "outline"}
              onClick={() => toggleCategory(c.value)}
            >
              {c.label}
            </Button>
          ))}
        {showBrands &&
          facets.brands.slice(0, 8).map((b) => (
            <Button
              key={b.value}
              type="button"
              size="sm"
              variant={filterState.brands.includes(b.value) ? "default" : "outline"}
              onClick={() => toggleBrand(b.value)}
            >
              {b.label}
            </Button>
          ))}
      </div>
    </aside>
  ) : null;

  return (
    <div>
      <ShowcaseSectionHeader title={title} subtitle={subtitle} />
      <CatalogContentLayout
        dir={dir}
        className={cn(
          "catalog-content-layout catalog-content-layout--product-discovery gap-4",
          title || subtitle ? "mt-6" : undefined,
        )}
        mainClassName="catalog-content-layout__main"
        contentClassName="catalog-content-layout__content space-y-4"
        sidebar={filters}
      >
        {p.showResultCount ? (
          <p className="text-sm text-muted-foreground">{total} products</p>
        ) : null}

        <ShowcaseProductPanel
          records={records}
          localePrefix={locale}
          layout={p.layout === "slider" ? "carousel" : p.layout === "mixed" ? "grid" : p.layout}
          columns={p.columns}
          flags={flags}
          loading={p.ajaxEnabled && fetchState.loading}
          emptyMessage={emptyMessage}
        />

        {p.loadMode === "loadMore" && filterState.page < (p.ajaxEnabled ? fetchState.totalPages : initialTotalPages) ? (
          <div className="text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilterState((s) => ({ ...s, page: s.page + 1 }))}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </CatalogContentLayout>
    </div>
  );
}
