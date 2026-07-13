"use client";

import type { Product } from "../../types";
import type { ResolvedProductPageDisplay } from "../../lib/product-page-display";
import type { ResolvedProductCtaConfig } from "../../lib/product-cta";
import type { PdpLabels } from "../../pdp/load-pdp-labels";
import { ProductInfoCore, ProductInfoSection } from "./product-info-sections";

type TagLink = { label: string; href?: string };

type Props = {
  product: Product;
  slug: string;
  localePrefix: string;
  labels: PdpLabels;
  display: ResolvedProductPageDisplay;
  productCta: ResolvedProductCtaConfig;
  linkedTags: TagLink[];
};

export function ProductInfo({
  product,
  slug,
  localePrefix,
  labels,
  display,
  productCta,
  linkedTags,
}: Props) {
  return (
    <aside className="prd-info" data-product-info>
      <ProductInfoCore product={product} slug={slug} labels={labels} display={display} />
      {display.shortDescription.enabled && product.short_description?.trim() ? (
        <ProductInfoSection
          section="shortDescription"
          product={product}
          localePrefix={localePrefix}
          labels={labels}
          display={display}
          productCta={productCta}
          linkedTags={linkedTags}
        />
      ) : null}
      {display.inlineCta.enabled && productCta.enabled && productCta.placements.inline ? (
        <ProductInfoSection
          section="inlineCta"
          product={product}
          slug={slug}
          localePrefix={localePrefix}
          labels={labels}
          display={display}
          productCta={productCta}
          linkedTags={linkedTags}
        />
      ) : null}
      {display.linkedTags.enabled && linkedTags.length > 0 ? (
        <ProductInfoSection
          section="linkedTags"
          product={product}
          localePrefix={localePrefix}
          labels={labels}
          display={display}
          productCta={productCta}
          linkedTags={linkedTags}
        />
      ) : null}
    </aside>
  );
}

export { ProductInfoCore, ProductInfoSection } from "./product-info-sections";
