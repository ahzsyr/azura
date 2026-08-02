"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  CollectionFacetOption,
  FacetOption,
  ListingFacets,
  ListingFilterState,
} from "@/features/products/listing/types";
import { ProductListingFilterSection } from "./product-listing-filter-section";
import { IconClose, IconSearch } from "./listing-ui-icons";
import type { ProductListingLabels } from "@/features/products/listing/listing-labels";

type Props = {
  facets: ListingFacets;
  state: ListingFilterState;
  labels: Pick<
    ProductListingLabels,
    | "filters"
    | "clearAll"
    | "collections"
    | "category"
    | "brand"
    | "tags"
    | "price"
    | "variations"
    | "condition"
    | "availability"
    | "inStockOnly"
    | "priceFrom"
    | "priceTo"
    | "priceRangeHint"
    | "searchFiltersPlaceholder"
  >;
  activeFilterCount: number;
  onClearAll: () => void;
  onToggleCollection: (slug: string) => void;
  onToggleCategory: (value: string) => void;
  onToggleBrand: (value: string) => void;
  onToggleTag: (value: string) => void;
  onToggleCondition: (value: string) => void;
  onToggleVariation: (type: string, option: string) => void;
  onStockChange: (checked: boolean) => void;
  onPriceMinChange: (value: number | null) => void;
  onPriceMaxChange: (value: number | null) => void;
  showCollectionsFacet?: boolean;
  showDrawerClose?: boolean;
  onCloseDrawer?: () => void;
};

function humanizeVariationType(type: string): string {
  return type
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function CheckboxList({
  options,
  selected,
  onToggle,
  listClassName,
  getItemStyle,
}: {
  options: FacetOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  listClassName?: string;
  getItemStyle?: (opt: FacetOption) => CSSProperties | undefined;
}) {
  return (
    <ul
      className={listClassName ? `pl-filter-options ${listClassName}` : "pl-filter-options"}
      role="list"
    >
      {options.map((opt) => {
        const checked = selected.has(opt.value);
        const disabled = opt.count === 0 && !checked;
        return (
          <li key={opt.value}>
            <label
              className={`pl-filter-check${disabled ? " pl-filter-check--disabled" : ""}`}
              style={getItemStyle?.(opt)}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(opt.value)}
              />
              <span className="pl-filter-check__label">{opt.label}</span>
              <span className="pl-filter-check__count">{opt.count}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductListingFilters({
  facets,
  state,
  labels,
  activeFilterCount,
  onClearAll,
  onToggleCollection,
  onToggleCategory,
  onToggleBrand,
  onToggleTag,
  onToggleCondition,
  onToggleVariation,
  onStockChange,
  onPriceMinChange,
  onPriceMaxChange,
  showCollectionsFacet = true,
  showDrawerClose = false,
  onCloseDrawer,
}: Props) {
  const [filterQuery, setFilterQuery] = useState("");
  const selectedCollections = new Set(state.collections);
  const selectedCategories = new Set(state.categories);
  const selectedBrands = new Set(state.brands);
  const selectedTags = new Set(state.tags);
  const selectedConditions = new Set(state.conditions);

  const filteredFacets = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return facets;

    const matches = (opt: FacetOption) =>
      opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query);

    return {
      collections: facets.collections.filter(matches),
      categories: facets.categories.filter(matches),
      brands: facets.brands.filter(matches),
      tags: facets.tags.filter(matches),
      conditions: facets.conditions.filter(matches),
      variations: Object.fromEntries(
        Object.entries(facets.variations)
          .map(([type, options]) => [type, options.filter(matches)])
          .filter(([, options]) => options.length > 0),
      ),
      priceMin: facets.priceMin,
      priceMax: facets.priceMax,
      currency: facets.currency,
    };
  }, [facets, filterQuery]);

  const variationTypes = Object.keys(facets.variations).sort();
  const variationTypesWithOpts = variationTypes.filter(
    (type) => (facets.variations[type] ?? []).length > 0,
  );
  const variationSelectionCount = Object.values(state.variations).reduce(
    (n, opts) => n + opts.length,
    0,
  );
  const hasVariationFilters = variationSelectionCount > 0;

  return (
    <>
      <div className="pl-filter-searchbar">
        <div className="pl-search-field">
          <span className="pl-search-icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            type="search"
            className="pl-search-input"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={labels.searchFiltersPlaceholder}
            aria-label={labels.searchFiltersPlaceholder}
            autoComplete="off"
          />
          {filterQuery.length > 0 ? (
            <button
              type="button"
              className="pl-search-clear"
              aria-label="Clear filter search"
              onClick={() => setFilterQuery("")}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      </div>
      <div className="pl-sidebar-head">
        <h2 className="pl-sidebar-head__title ui-text-label">{labels.filters}</h2>
        <div className="pl-sidebar-head__actions">
          {activeFilterCount > 0 ? (
            <button type="button" className="pl-clear-all pl-clear-all--sidebar" onClick={onClearAll}>
              {labels.clearAll}
            </button>
          ) : null}
          {showDrawerClose && onCloseDrawer ? (
            <button
              type="button"
              className="pl-sidebar-close"
              aria-label="Close filters"
              onClick={onCloseDrawer}
            >
              <IconClose />
            </button>
          ) : null}
        </div>
      </div>

      {showCollectionsFacet && filteredFacets.collections.length > 0 ? (
        <ProductListingFilterSection
          title={labels.collections}
          count={state.collections.length}
          defaultOpen={state.collections.length > 0}
        >
          <CheckboxList
            listClassName="pl-filter-options--collections"
            options={filteredFacets.collections}
            selected={selectedCollections}
            onToggle={onToggleCollection}
            getItemStyle={(opt) => {
              const col = facets.collections.find((c) => c.value === opt.value) as
                | CollectionFacetOption
                | undefined;
              return col ? ({ "--pl-depth": col.depth } as CSSProperties) : undefined;
            }}
          />
        </ProductListingFilterSection>
      ) : null}

      {filteredFacets.categories.length > 0 ? (
        <ProductListingFilterSection
          title={labels.category}
          count={state.categories.length}
          defaultOpen={state.categories.length > 0}
        >
          <CheckboxList
            options={filteredFacets.categories}
            selected={selectedCategories}
            onToggle={onToggleCategory}
          />
        </ProductListingFilterSection>
      ) : null}

      {filteredFacets.brands.length > 0 ? (
        <ProductListingFilterSection
          title={labels.brand}
          count={state.brands.length}
          defaultOpen={state.brands.length > 0}
        >
          <CheckboxList
            options={filteredFacets.brands}
            selected={selectedBrands}
            onToggle={onToggleBrand}
          />
        </ProductListingFilterSection>
      ) : null}

      {filteredFacets.tags.length > 0 ? (
        <ProductListingFilterSection
          title={labels.tags}
          count={state.tags.length}
          defaultOpen={state.tags.length > 0}
        >
          <CheckboxList
            options={filteredFacets.tags}
            selected={selectedTags}
            onToggle={onToggleTag}
          />
        </ProductListingFilterSection>
      ) : null}

      <ProductListingFilterSection
        title={labels.price}
        count={state.priceMin != null || state.priceMax != null ? 1 : 0}
        defaultOpen={state.priceMin != null || state.priceMax != null}
      >
        <div className="pl-price-range">
          <p className="pl-price-range__hint">
            {labels.priceRangeHint} ({facets.currency})
          </p>
          <div className="pl-price-range__inputs">
            <input
              type="number"
              min={facets.priceMin}
              max={facets.priceMax}
              placeholder={labels.priceFrom}
              value={state.priceMin ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onPriceMinChange(v === "" ? null : Number(v));
              }}
            />
            <span className="pl-price-range__sep">–</span>
            <input
              type="number"
              min={facets.priceMin}
              max={facets.priceMax}
              placeholder={labels.priceTo}
              value={state.priceMax ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onPriceMaxChange(v === "" ? null : Number(v));
              }}
            />
          </div>
        </div>
      </ProductListingFilterSection>

      {variationTypesWithOpts.length > 0 ? (
        <ProductListingFilterSection
          title={labels.variations}
          count={variationSelectionCount}
          defaultOpen={hasVariationFilters}
        >
          {variationTypesWithOpts.map((type) => {
            const opts = filteredFacets.variations[type] ?? [];
            const selected = new Set(state.variations[type] ?? []);
            return (
              <div className="pl-filter-variation-group" key={type}>
                <p className="pl-filter-variation-group__label">{humanizeVariationType(type)}</p>
                <CheckboxList
                  options={opts}
                  selected={selected}
                  onToggle={(opt) => onToggleVariation(type, opt)}
                />
              </div>
            );
          })}
        </ProductListingFilterSection>
      ) : null}

      {filteredFacets.conditions.length > 0 ? (
        <ProductListingFilterSection
          title={labels.condition}
          count={state.conditions.length}
          defaultOpen={state.conditions.length > 0}
        >
          <CheckboxList
            options={filteredFacets.conditions}
            selected={selectedConditions}
            onToggle={onToggleCondition}
          />
        </ProductListingFilterSection>
      ) : null}

      <ProductListingFilterSection title={labels.availability} defaultOpen={state.stockOnly}>
        <label className="pl-filter-check">
          <input
            type="checkbox"
            checked={state.stockOnly}
            onChange={(e) => onStockChange(e.target.checked)}
          />
          <span className="pl-filter-check__label">{labels.inStockOnly}</span>
        </label>
      </ProductListingFilterSection>
    </>
  );
}
