import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";
import type { ResolvedProductCardDesign } from "@/features/products/card-design/product-card-design.types";
import type { ResolvedProductCardBadge } from "@/features/products/card-design/resolve-product-card-badges";
import type { ProductCardPriceDisplay } from "@/features/products/card-design/product-card-price";

/** Template-ready product card shape — no Prisma rows or raw storage JSON. */
export type ProductCardViewModel = {
  templateId: "product-card";
  entityId: string;
  slug: string;
  product: ProductListingRecord;
  href: string;
  navHref: string;
  numberLocale: string;
  localePrefix: string;
  priority: boolean;
  cardLayout: ResolvedProductCardLayout;
  cardDisplay: ResolvedProductCardDisplay;
  design: ResolvedProductCardDesign;
  buyNow: ResolvedProductBuyNow;
  productCta: ResolvedProductCtaConfig;
  cardVariant: ProductCardVariant;
  badges: ResolvedProductCardBadge[];
  priceDisplay: ProductCardPriceDisplay;
  discountPercent: number;
  buyNowHref: string | null;
  showProductCta: boolean;
  showBuyNow: boolean;
  ctaLayout: ResolvedProductCtaConfig["cardLayout"];
  cardActionArrangement: ResolvedProductCardLayout["cardActionArrangement"];
  hasRating: boolean;
  layoutTokens: Record<string, string>;
  designDataAttrs: Record<string, string>;
  linkPrefetch?: boolean;
  personalizationFlags?: {
    recent?: boolean;
    recommended?: boolean;
    trending?: boolean;
  };
};
