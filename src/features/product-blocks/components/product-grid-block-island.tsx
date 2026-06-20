"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { filterStateFromSearchParams } from "@/features/products/listing/url-state";
import { ProductListingGrid } from "@/features/products/components/listing/product-listing-grid";
import { filterListingCatalog, paginateListing } from "@/features/products/listing/filter";
import { sortListingRecords } from "@/features/products/listing/sort-listing";
import type { ListingFilterState, ProductListingRecord } from "@/features/products/listing/types";
import { LISTING_PER_OPTIONS } from "@/features/products/listing/types";
import type { ProductSelectionConfig } from "@/features/product-blocks/schemas/product-blocks";
import { CatalogContentLayout } from "@/features/catalog/components/catalog-content-layout";
import { getDirection } from "@/i18n/routing";

type Props = {
  localePrefix: string;
  numberLocale?: string;
  initialRecords: ProductListingRecord[];
  pageSize: number;
  viewMode: "grid" | "list";
  sortBy: ProductSelectionConfig["sortBy"];
  emptyMessage: string;
};

export function ProductGridBlockIsland({
  localePrefix,
  numberLocale = "en-US",
  initialRecords,
  pageSize,
  viewMode,
  sortBy,
  emptyMessage,
}: Props) {
  const dir = getDirection(localePrefix);
  const per = (LISTING_PER_OPTIONS.includes(pageSize as (typeof LISTING_PER_OPTIONS)[number])
    ? pageSize
    : 12) as ListingFilterState["per"];

  const searchParams = useSearchParams();
  const urlState = useMemo(
    () => filterStateFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [q, setQ] = useState(urlState.q);
  const [sort, setSort] = useState(sortBy);
  const [page, setPage] = useState(urlState.page);
  const [stockOnly, setStockOnly] = useState(urlState.stockOnly);
  const [urlFilters, setUrlFilters] = useState(urlState);

  useEffect(() => {
    setUrlFilters(urlState);
    setQ(urlState.q);
    setStockOnly(urlState.stockOnly);
    setPage(urlState.page);
  }, [urlState]);

  const filtered = useMemo(() => {
    const state: ListingFilterState = {
      q,
      categories: urlFilters.categories,
      brands: urlFilters.brands,
      collections: urlFilters.collections,
      collectionScope: urlFilters.collectionScope,
      tags: urlFilters.tags,
      conditions: urlFilters.conditions,
      variations: urlFilters.variations,
      priceMin: urlFilters.priceMin,
      priceMax: urlFilters.priceMax,
      stockOnly,
      page: 1,
      per,
    };
    const base = filterListingCatalog(initialRecords, state);
    return sortListingRecords(base, sort);
  }, [initialRecords, q, stockOnly, sort, per, urlFilters]);

  const pagination = useMemo(() => paginateListing(filtered, page, per), [filtered, page, per]);

  return (
    <CatalogContentLayout
      dir={dir}
      className="catalog-content-layout catalog-content-layout--product-grid-block"
      mainClassName="catalog-content-layout__main"
      contentClassName="catalog-content-layout__content space-y-4"
    >
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search products…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as ProductSelectionConfig["sortBy"]);
            setPage(1);
          }}
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="price-asc">Price low–high</option>
          <option value="price-desc">Price high–low</option>
          <option value="newest">Newest</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={stockOnly}
            onChange={(e) => {
              setStockOnly(e.target.checked);
              setPage(1);
            }}
          />
          In stock only
        </label>
      </div>
      <ProductListingGrid
        products={pagination.items}
        localePrefix={localePrefix}
        viewMode={viewMode}
        numberLocale={numberLocale}
        emptyMessage={emptyMessage}
      />
      {pagination.totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
          <button
            type="button"
            className="text-sm px-3 py-1 border rounded-md disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="text-sm px-3 py-1 border rounded-md disabled:opacity-40"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
          >
            Next
          </button>
        </nav>
      ) : null}
    </CatalogContentLayout>
  );
}
