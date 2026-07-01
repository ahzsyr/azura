import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import type { ProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";

export type QuickViewCommerceFlags = {
  showBuyNow: boolean;
  showProductCta: boolean;
  buyNowHref: string | null;
};

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
  buyNow?: ResolvedProductBuyNow;
  productCta?: ResolvedProductCtaConfig;
  buyNowHref?: string | null;
  commerceByViewport?: Record<ProductPageViewport, QuickViewCommerceFlags>;
};

/** Snapshot from a listing card — shown instantly while API/cache resolves. */
export type QuickViewSeed = Omit<QuickViewData, "cardDisplayByViewport" | "commerceByViewport"> & {
  cardDisplay?: ResolvedProductCardDisplay;
  commerce?: QuickViewCommerceFlags;
};
