"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { Product } from "../../types";
import type { ResolvedProductPageDisplay } from "../../lib/product-page-display";
import type { ResolvedProductCtaConfig } from "../../lib/product-cta";
import type { PdpLabels } from "../../pdp/load-pdp-labels";
import { ProductInfoCore, ProductInfoSection } from "./product-info-sections";

type TagLink = { label: string; href?: string };

type Props = {
  product: Product;
  localePrefix: string;
  labels: PdpLabels;
  display: ResolvedProductPageDisplay;
  productCta: ResolvedProductCtaConfig;
  linkedTags: TagLink[];
};

export function ProductInfo({
  product,
  localePrefix,
  labels,
  display,
  productCta,
  linkedTags,
}: Props) {
  useEffect(() => {
    const btn = document.querySelector("[data-scroll-to-reviews]");
    const handler = () => {
      window.dispatchEvent(new CustomEvent("product:tab-change", { detail: { key: "reviews" } }));
      document.getElementById("prd-tab-reviews")?.focus({ preventScroll: true });
      document.querySelector("[data-product-reviews]")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    btn?.addEventListener("click", handler);
    return () => btn?.removeEventListener("click", handler);
  }, []);

  return (
    <aside className="prd-info" data-product-info>
      <ProductInfoCore product={product} labels={labels} display={display} />
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
