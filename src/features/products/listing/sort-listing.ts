import type { ProductListingRecord } from "./types";

export type CollectionSortKey = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";

export function sortListingRecords(
  records: ProductListingRecord[],
  sortBy: CollectionSortKey = "name-asc",
): ProductListingRecord[] {
  const copy = [...records];
  copy.sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.priceMin - b.priceMin;
      case "price-desc":
        return b.priceMax - a.priceMax;
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "newest":
        return (b.id ?? b.slug).localeCompare(a.id ?? a.slug);
      default:
        return a.name.localeCompare(b.name);
    }
  });
  return copy;
}
