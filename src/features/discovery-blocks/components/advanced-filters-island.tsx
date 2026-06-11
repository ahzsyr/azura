"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductListingFilters } from "@/features/products/components/listing/product-listing-filters";
import { SearchFilterChips } from "@/features/search/components/search-ui/search-filter-chips";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";
import type { ListingFacets, ListingFilterState } from "@/features/products/listing/types";
import {
  countActiveFilters,
  filterStateFromSearchParams,
  searchParamsFromFilterState,
} from "@/features/products/listing/url-state";
import { useGlobalSearch } from "@/features/search/hooks/use-global-search";
import type { PublicSearchConfig } from "@/features/search/settings/public-search-config";
import type { SearchLocale } from "@/features/search/components/search-ui/search-copy";
import { parseAdvancedFiltersProps } from "@/features/discovery-blocks/lib/parse-block-props";
import { cn } from "@/lib/utils";

const DEFAULT_LISTING_LABELS = {
  filters: "Filters",
  clearAll: "Clear all",
  collections: "Collections",
  category: "Category",
  brand: "Brand",
  tags: "Tags",
  price: "Price",
  variations: "Options",
  condition: "Condition",
  availability: "Availability",
  inStockOnly: "In stock only",
  priceFrom: "From",
  priceTo: "To",
  priceRangeHint: "Min – max",
  searchFiltersPlaceholder: "Search filters…",
};

type Props = {
  locale: string;
  blockProps: Record<string, unknown>;
  searchConfig?: PublicSearchConfig;
};

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function AdvancedFiltersIsland({ locale, blockProps: raw, searchConfig }: Props) {
  const p = parseAdvancedFiltersProps(raw);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [facets, setFacets] = useState<ListingFacets | null>(null);
  const [filterState, setFilterState] = useState<ListingFilterState>(() =>
    filterStateFromSearchParams(new URLSearchParams(searchParams.toString()))
  );

  useEffect(() => {
    if (p.scope !== "products") return;
    fetch(`/api/catalog/listing?locale=${encodeURIComponent(locale)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.facets) setFacets(data.facets as ListingFacets);
        else if (data.records) {
          setFacets(aggregateFacets(data.records, []));
        }
      })
      .catch(() => setFacets(null));
  }, [locale, p.scope]);

  useEffect(() => {
    setFilterState(filterStateFromSearchParams(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  const pushFilterState = useCallback(
    (next: ListingFilterState) => {
      if (!p.syncUrl) {
        setFilterState(next);
        return;
      }
      const href = searchParamsFromFilterState(next, pathname);
      router.push(href);
    },
    [p.syncUrl, pathname, router]
  );

  const search = useGlobalSearch({
    apiBase: "/api/search",
    discoveryUrl: "/api/search/discovery",
    locale: locale as SearchLocale,
    config: searchConfig ?? { enabled: true, globalSearchEnabled: true } as PublicSearchConfig,
    active: p.scope === "search",
  });

  const syncSearchFacetsToUrl = useCallback(
    (facetsMap: Record<string, string[]>) => {
      if (!p.syncUrl) return;
      const params = new URLSearchParams(searchParams.toString());
      if (Object.keys(facetsMap).length) {
        params.set("facets", JSON.stringify(facetsMap));
      } else {
        params.delete("facets");
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [p.syncUrl, pathname, router, searchParams]
  );

  useEffect(() => {
    if (p.scope !== "search" || !p.syncUrl) return;
    const rawFacets = searchParams.get("facets");
    if (!rawFacets) return;
    try {
      const parsed = JSON.parse(rawFacets) as Record<string, string[]>;
      if (parsed && typeof parsed === "object") {
        Object.entries(parsed).forEach(([k, v]) => {
          v.forEach((val) => search.toggleFacetValue(k, val));
        });
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, []);

  useEffect(() => {
    if (p.scope === "search" && p.syncUrl) {
      syncSearchFacetsToUrl(search.activeFacetFilters);
    }
  }, [search.activeFacetFilters, p.scope, p.syncUrl, syncSearchFacetsToUrl]);

  const activeFilterCount = useMemo(() => countActiveFilters(filterState), [filterState]);

  if (p.scope === "products" && facets) {
    const layoutClass =
      p.layout === "chips"
        ? "flex flex-wrap gap-2"
        : p.layout === "drawer"
          ? "rounded-xl border p-4"
          : "rounded-xl border p-4 max-w-xs";

    return (
      <div className={layoutClass}>
        <ProductListingFilters
          facets={facets}
          state={filterState}
          labels={DEFAULT_LISTING_LABELS}
          activeFilterCount={activeFilterCount}
          onClearAll={() =>
            pushFilterState({
              ...filterState,
              q: "",
              categories: [],
              brands: [],
              collections: [],
              collectionScope: null,
              tags: [],
              conditions: [],
              variations: {},
              priceMin: null,
              priceMax: null,
              stockOnly: false,
              page: 1,
            })
          }
          onToggleCollection={(slug) =>
            pushFilterState({
              ...filterState,
              collections: toggleInList(filterState.collections, slug),
              page: 1,
            })
          }
          onToggleCategory={(value) =>
            pushFilterState({
              ...filterState,
              categories: toggleInList(filterState.categories, value),
              page: 1,
            })
          }
          onToggleBrand={(value) =>
            pushFilterState({
              ...filterState,
              brands: toggleInList(filterState.brands, value),
              page: 1,
            })
          }
          onToggleTag={(value) =>
            pushFilterState({
              ...filterState,
              tags: toggleInList(filterState.tags, value),
              page: 1,
            })
          }
          onToggleCondition={(value) =>
            pushFilterState({
              ...filterState,
              conditions: toggleInList(filterState.conditions, value),
              page: 1,
            })
          }
          onToggleVariation={(type, option) => {
            const cur = filterState.variations[type] ?? [];
            const next = cur.includes(option)
              ? cur.filter((o) => o !== option)
              : [...cur, option];
            const variations = { ...filterState.variations };
            if (next.length) variations[type] = next;
            else delete variations[type];
            pushFilterState({ ...filterState, variations, page: 1 });
          }}
          onStockChange={(checked) =>
            pushFilterState({ ...filterState, stockOnly: checked, page: 1 })
          }
          onPriceMinChange={(value) =>
            pushFilterState({ ...filterState, priceMin: value, page: 1 })
          }
          onPriceMaxChange={(value) =>
            pushFilterState({ ...filterState, priceMax: value, page: 1 })
          }
        />
      </div>
    );
  }

  if (p.scope === "search") {
    const typeChips = [
      {
        id: "all",
        label: search.t.all,
        active: search.activeTypes.length === 0,
        onClick: () => search.setActiveTypes([]),
      },
      ...search.filterEntityTypes.map((type) => ({
        id: type,
        label: search.entityLabel(type),
        active: search.activeTypes.includes(type),
        onClick: () =>
          search.setActiveTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
          ),
      })),
    ];

    return (
      <div className={cn("space-y-3", p.layout === "chips" && "space-y-2")}>
        {search.runtimeConfig.showEntityTypeChips !== false ? (
          <SearchFilterChips chips={typeChips} />
        ) : null}
        {search.showContentTypeChips && search.discoveryContentTypes?.length ? (
          <SearchFilterChips
            chips={search.discoveryContentTypes.map((ct) => ({
              id: ct.slug,
              label: locale.startsWith("ar") ? ct.labelAr : ct.labelEn,
              active: (search.activeFacetFilters.contentType ?? []).includes(ct.slug),
              onClick: () => search.toggleFacetValue("contentType", ct.slug),
            }))}
          />
        ) : null}
        {search.enabledFilters
          .filter((f) => f.id !== "contentType")
          .map((filter) => {
            const options = search.facetValueOptions.get(filter.id);
            if (!options?.size) return null;
            const label =
              locale.startsWith("ar") && filter.labelAr ? filter.labelAr : filter.labelEn;
            return (
              <div key={filter.id} className="space-y-1.5">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
                <SearchFilterChips
                  chips={[...options].slice(0, 12).map((value) => ({
                    id: `${filter.id}-${value}`,
                    label: value,
                    active: (search.activeFacetFilters[filter.id] ?? []).includes(value),
                    onClick: () => search.toggleFacetValue(filter.id, value),
                  }))}
                />
              </div>
            );
          })}
      </div>
    );
  }

  if (p.scope === "content") {
    const paramKey = p.contentTypeSlug ? "attr" : "tag";
    const active = searchParams.getAll(paramKey);
    return (
      <p className="text-sm text-muted-foreground">
        Content filters sync via URL param <code>{paramKey}</code>. Configure dimensions in block
        settings.
        {active.length > 0 ? ` Active: ${active.join(", ")}` : ""}
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground py-4 border border-dashed rounded-lg text-center">
      Loading filters…
    </p>
  );
}
