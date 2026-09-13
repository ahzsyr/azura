import { z } from "zod";
import {
  DEFAULT_PRODUCT_LISTING_FILTER_DISPLAY_ORDER,
  DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY,
  PRODUCT_LISTING_FILTER_SECTION_IDS,
  normalizeProductListingFilterDisplayOrder,
  type ProductListingFilterSectionId,
} from "@/features/products/listing/product-listing-filter-keys";

const visibilitySchema = z.object(
  Object.fromEntries(
    PRODUCT_LISTING_FILTER_SECTION_IDS.map((id) => [id, z.boolean()]),
  ) as Record<ProductListingFilterSectionId, z.ZodBoolean>,
);

export const productListingFiltersSettingsSchema = z.object({
  showSidebar: z.boolean(),
  visibility: visibilitySchema,
  displayOrder: z.array(z.string()),
});

export type ProductListingFilterSettings = {
  /** Master switch for the catalog filters sidebar (desktop) and mobile drawer. */
  showSidebar: boolean;
  visibility: Record<ProductListingFilterSectionId, boolean>;
  displayOrder: ProductListingFilterSectionId[];
};

export const DEFAULT_PRODUCT_LISTING_FILTER_SETTINGS: ProductListingFilterSettings = {
  showSidebar: true,
  visibility: { ...DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY },
  displayOrder: [...DEFAULT_PRODUCT_LISTING_FILTER_DISPLAY_ORDER],
};

export function parseProductListingFilterSettings(raw: unknown): ProductListingFilterSettings {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_PRODUCT_LISTING_FILTER_SETTINGS,
      showSidebar: true,
      visibility: { ...DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY },
      displayOrder: [...DEFAULT_PRODUCT_LISTING_FILTER_DISPLAY_ORDER],
    };
  }

  const obj = raw as Record<string, unknown>;
  const showSidebar = obj.showSidebar !== false;
  const rawVisibility =
    obj.visibility && typeof obj.visibility === "object"
      ? (obj.visibility as Record<string, unknown>)
      : {};

  const visibility = { ...DEFAULT_PRODUCT_LISTING_FILTER_VISIBILITY };
  for (const id of PRODUCT_LISTING_FILTER_SECTION_IDS) {
    if (typeof rawVisibility[id] === "boolean") {
      visibility[id] = rawVisibility[id];
    }
  }

  const displayOrder = normalizeProductListingFilterDisplayOrder(
    Array.isArray(obj.displayOrder) ? (obj.displayOrder as string[]) : undefined,
  );

  return { showSidebar, visibility, displayOrder };
}
