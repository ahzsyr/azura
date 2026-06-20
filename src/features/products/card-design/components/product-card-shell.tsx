"use client";

import type { CSSProperties, ReactNode } from "react";
import { productCardLayoutDataAttrs } from "@/features/products/lib/product-storefront-layout";
import { sharedElementRootAttrs } from "@/lib/navigation/shared-elements";
import type { ProductCardRenderContext } from "./product-card-context";
import { ProductCardHoverBinding } from "./product-card-hover-binding";

type Props = {
  ctx: ProductCardRenderContext;
  cardStyle?: CSSProperties;
  children: ReactNode;
};

export function ProductCardShell({ ctx, cardStyle, children }: Props) {
  const layoutStyle: CSSProperties = {
    ...(ctx.layoutTokens as CSSProperties),
    ...cardStyle,
  };

  const personalizationAttrs: Record<string, string> = {};
  if (ctx.personalizationFlags?.recent) personalizationAttrs["data-prd-personalization-recent"] = "true";
  if (ctx.personalizationFlags?.recommended) personalizationAttrs["data-prd-personalization-reco"] = "true";
  if (ctx.personalizationFlags?.trending) personalizationAttrs["data-prd-personalization-trend"] = "true";

  return (
    <article
      className="pl-card"
      data-product-slug={ctx.product.slug}
      data-pl-card-has-cta={ctx.showBuyNow || ctx.showQuoteCta ? "" : undefined}
      data-pl-card-actions={ctx.cardActionArrangement}
      data-pl-card-variant={ctx.cardVariant !== "default" ? ctx.cardVariant : undefined}
      style={layoutStyle}
      {...productCardLayoutDataAttrs(ctx.cardLayout)}
      {...ctx.designDataAttrs}
      {...personalizationAttrs}
      {...sharedElementRootAttrs("product", ctx.product.slug)}
    >
      <ProductCardHoverBinding hoverEffect={ctx.design.hoverEffect} />
      {children}
    </article>
  );
}
