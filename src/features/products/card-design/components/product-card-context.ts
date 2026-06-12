"use client";

import type { ReactNode } from "react";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";
import type { ResolvedProductCardDesign } from "../product-card-design.types";
import type { ResolvedProductCardBadge } from "../resolve-product-card-badges";
import type { ProductCardPriceDisplay } from "../product-card-price";

export type ProductCardRenderContext = {
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
  quoteCta: ResolvedProductCtaConfig;
  cardVariant: ProductCardVariant;
  badges: ResolvedProductCardBadge[];
  priceDisplay: ProductCardPriceDisplay;
  discountPercent: number;
  buyNowHref: string | null;
  showQuoteCta: boolean;
  showBuyNow: boolean;
  quoteLayout: ResolvedProductCtaConfig["cardLayout"];
  cardActionArrangement: ResolvedProductCardLayout["cardActionArrangement"];
  hasRating: boolean;
  quoteCtaNode: ReactNode;
  buyNowNode: ReactNode;
  layoutTokens: Record<string, string>;
  designDataAttrs: Record<string, string>;
  personalizationFlags?: {
    recent?: boolean;
    recommended?: boolean;
    trending?: boolean;
  };
};
