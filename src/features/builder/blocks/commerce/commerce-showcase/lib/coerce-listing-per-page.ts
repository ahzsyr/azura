import { LISTING_PER_OPTIONS, type ListingPerPage } from "@/features/products/listing/types";

export function coerceListingPerPage(value: number): ListingPerPage {
  if (LISTING_PER_OPTIONS.includes(value as ListingPerPage)) {
    return value as ListingPerPage;
  }
  if (value <= 10) return 10;
  if (value <= 20) return 20;
  if (value <= 30) return 30;
  return 50;
}
