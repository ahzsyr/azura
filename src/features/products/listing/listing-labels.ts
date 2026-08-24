export type CatalogToolbarLabels = {
  sort: string;
  sortNameAsc: string;
  sortNameDesc: string;
  sortItemsDesc: string;
  viewCollection: string;
};

export type ProductListingLabels = {
  filters: string;
  clearAll: string;
  collections: string;
  category: string;
  brand: string;
  tags: string;
  price: string;
  condition: string;
  variations: string;
  availability: string;
  inStockOnly: string;
  priceFrom: string;
  priceTo: string;
  priceRangeHint: string;
  searchPlaceholder: string;
  searchFiltersPlaceholder: string;
  noProducts: string;
  resultsCount: string;
  showPer: string;
  prev: string;
  next: string;
  filtersFab: string;
  activeFilters: string;
  loading?: string;
};

export function buildProductListingLabels(
  mode: "product" | "collection",
  t: (key: string, fallback: string) => string,
): { labels: ProductListingLabels; catalogToolbarLabels: CatalogToolbarLabels } {
  const isCollection = mode === "collection";

  const labels: ProductListingLabels = {
    filters: t("product.filters", "Filters"),
    clearAll: t("product.clearFilters", "Clear all"),
    collections: t("collection.breadcrumb", "Collections"),
    category: t("product.category", "Category"),
    brand: t("product.brand", "Brand"),
    tags: t("product.tags", "Tags"),
    price: t("product.price", "Price"),
    variations: t("product.variations", "Specifications"),
    condition: t("product.condition", "Condition"),
    availability: t("product.availability", "Availability"),
    inStockOnly: t("product.inStockOnly", "In stock only"),
    priceFrom: t("product.priceFrom", "Min"),
    priceTo: t("product.priceTo", "Max"),
    priceRangeHint: t("product.priceRangeHint", "Range"),
    searchPlaceholder: isCollection
      ? t("collection.searchPlaceholder", "Search collections…")
      : t("product.searchPlaceholder", "Search products…"),
    searchFiltersPlaceholder: t("product.searchFiltersPlaceholder", "Search filters…"),
    noProducts: isCollection
      ? t("collection.noCollectionsFound", "No collections match your filters.")
      : t("product.noProductsFound", "No products match your filters."),
    resultsCount: isCollection
      ? t("collection.resultsCount", "{first}–{last} of {total} collections")
      : t("product.resultsCount", "{first}–{last} of {total} products"),
    showPer: t("product.showPer", "Show"),
    prev: t("product.prevPage", "← Prev"),
    next: t("product.nextPage", "Next →"),
    filtersFab: t("product.filtersFab", "Filters"),
    activeFilters: t("product.activeFilters", "Active filters"),
    loading: isCollection
      ? t("collection.loading", "Loading collections…")
      : t("product.loading", "Loading products…"),
  };

  const catalogToolbarLabels: CatalogToolbarLabels = {
    sort: isCollection ? t("collection.sort", "Sort") : t("product.sortBy", "Sort"),
    sortNameAsc: isCollection
      ? t("collection.sortNameAsc", "Name A–Z")
      : t("product.sortNameAsc", "Name A–Z"),
    sortNameDesc: isCollection
      ? t("collection.sortNameDesc", "Name Z–A")
      : t("product.sortNameDesc", "Name Z–A"),
    sortItemsDesc: isCollection
      ? t("collection.sortItemsDesc", "Most items")
      : t("product.sortNewest", "Most relevant"),
    viewCollection: t("collection.viewAll", "View"),
  };

  return { labels, catalogToolbarLabels };
}
