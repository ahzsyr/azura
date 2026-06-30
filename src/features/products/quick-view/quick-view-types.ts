import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import type { ProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";

export type QuickViewData = {
  slug: string;
  name: string;
  brand?: string;
  short_description?: string;
  price: { value: number; currency: string };
  old_price?: number | null;
  primary_image?: string;
  gallery_images?: string[];
  in_stock: boolean;
  rating?: number;
  reviews_count?: number;
  cardDisplayByViewport?: Record<ProductPageViewport, ResolvedProductCardDisplay>;
};

/** Snapshot from a listing card — shown instantly while API/cache resolves. */
export type QuickViewSeed = Omit<QuickViewData, "cardDisplayByViewport"> & {
  cardDisplay?: ResolvedProductCardDisplay;
};
