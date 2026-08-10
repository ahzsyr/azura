import { PLACEHOLDER_IMAGE_PATH } from "@/features/media/constants";
import type { ProductListingRecord } from "@/features/products/listing/types";

export const MOCK_LISTING_RECORD_SALE: ProductListingRecord = {
  slug: "preview-product",
  id: "preview-product-id",
  name: "UniFi Dream Machine Pro Max",
  brand: "Ubiquiti",
  category: "Networking",
  categories: ["Networking", "Gateways"],
  tags: ["badge:new", "Wi-Fi 7"],
  price: { value: 499, currency: "USD" },
  old_price: 599,
  priceMin: 499,
  priceMax: 499,
  short_description: "Enterprise gateway with 10G SFP+ and integrated NVR.",
  in_stock: true,
  rating: 4.8,
  reviews_count: 124,
  primary_image: PLACEHOLDER_IMAGE_PATH,
  secondary_image: undefined,
  gallery_images: [PLACEHOLDER_IMAGE_PATH],
  conditions: [],
  variationFacets: {},
  collectionSlugs: [],
  searchText: "unifi dream machine",
};

export const MOCK_LISTING_RECORD_OOS: ProductListingRecord = {
  ...MOCK_LISTING_RECORD_SALE,
  slug: "preview-oos",
  id: "preview-oos-id",
  name: "Compact PoE Switch 8-Port",
  in_stock: false,
  old_price: null,
  price: { value: 129, currency: "USD" },
};

export const MOCK_LISTING_RECORD_LUXURY: ProductListingRecord = {
  ...MOCK_LISTING_RECORD_SALE,
  slug: "preview-luxury",
  id: "preview-luxury-id",
  name: "Designer Mesh Access Point — Limited Edition",
  brand: "Premium Series",
  tags: ["badge:exclusive", "badge:staff_pick"],
  price: { value: 1299, currency: "USD" },
  old_price: undefined,
};
