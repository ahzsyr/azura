"use client";

import Link from "next/link";
import type { Product } from "../../types";
import type { ResolvedProductPageDisplay } from "../../lib/product-page-display";
import type { ResolvedProductCtaConfig } from "../../lib/product-cta";
import type { PdpLabels } from "../../pdp/load-pdp-labels";
import type { ProductPageSideOrderKey } from "../../lib/product-page-display";
import { ProductCtaButton } from "./product-cta-button";

type TagLink = { label: string; href?: string };

export type ProductInfoSectionKey = Extract<
  ProductPageSideOrderKey,
  "linkedTags" | "shortDescription" | "inlineCta"
>;

type CoreProps = {
  product: Product;
  labels: PdpLabels;
  display: ResolvedProductPageDisplay;
};

export function ProductInfoCore({ product, labels, display }: CoreProps) {
  const title = product.productTitle || product.name || product.title || labels.productFallback;
  const reviewRatingRaw = Number(product.reviews?.rating ?? 0);
  const reviewRating = Number.isFinite(reviewRatingRaw) ? reviewRatingRaw : 0;
  const reviewCountRaw = Number(product.reviews?.count ?? 0);
  const reviewCount = Number.isFinite(reviewCountRaw) ? Math.max(0, Math.floor(reviewCountRaw)) : 0;

  return (
    <>
      <div className="prd-info__brand" data-prd-compact-key="brand">
        {product.brand || labels.brand}
      </div>
      <h1 className="prd-info__title ui-text-product-detail" data-prd-compact-key="title">
        {title}
      </h1>
      <div className="prd-info__meta">
        <div className="prd-info__sku" data-prd-compact-key="sku">
          {labels.sku}: <span data-sku>{product.mpn || product.manufacturer_part_number || "-"}</span>
        </div>
        {product.ean ? (
          <div className="prd-info__ean" data-prd-compact-key="ean">
            EAN: {product.ean}
          </div>
        ) : null}
      </div>
      {display.tabReviews.enabled && reviewCount > 0 ? (
        <div className="prd-info__rating" data-rating data-prd-compact-key="rating">
          <span
            className="prd-info__stars"
            style={{ ["--rating" as string]: `${(reviewRating / 5) * 100}%` }}
          >
            ★★★★★
          </span>
          <span className="prd-info__rating-value">{reviewRating.toFixed(1)}</span>
          <button type="button" className="prd-info__review-count" data-scroll-to-reviews>
            ({reviewCount} {labels.reviews})
          </button>
        </div>
      ) : null}
    </>
  );
}

type SectionProps = CoreProps & {
  section: ProductInfoSectionKey;
  localePrefix: string;
  productCta: ResolvedProductCtaConfig;
  linkedTags: TagLink[];
};

export function ProductInfoSection({
  section,
  product,
  localePrefix,
  labels,
  display,
  productCta,
  linkedTags,
}: SectionProps) {
  if (section === "shortDescription") {
    if (!display.shortDescription.enabled || !product.short_description?.trim()) return null;
    return (
      <div className="prd-info__short-desc" data-prd-compact-key="shortDescription">
        {product.short_description}
      </div>
    );
  }

  if (section === "inlineCta") {
    if (!display.inlineCta.enabled || !productCta.enabled || !productCta.placements.inline) return null;
    return (
      <div className="prd-info__cta-secondary" data-prd-compact-key="inlineCta">
        <ProductCtaButton config={productCta} localePrefix={localePrefix} placement="inline" />
      </div>
    );
  }

  if (section === "linkedTags") {
    if (!display.linkedTags.enabled || linkedTags.length === 0) return null;
    return (
      <div className="prd-info__tags" data-prd-compact-key="linkedTags">
        <p className="prd-info__tags-heading">{labels.exploreCollections}</p>
        <div className="prd-info__tags-list">
          {linkedTags.slice(0, 12).map((tag) =>
            tag.href ? (
              <Link key={tag.label} href={tag.href} className="prd-info__tag">
                {tag.label}
              </Link>
            ) : (
              <span key={tag.label} className="prd-info__tag prd-info__tag--muted">
                {tag.label}
              </span>
            ),
          )}
        </div>
      </div>
    );
  }

  return null;
}

const INFO_SECTION_KEYS = new Set<ProductInfoSectionKey>(["linkedTags", "shortDescription", "inlineCta"]);

export function isProductInfoSectionKey(key: string): key is ProductInfoSectionKey {
  return INFO_SECTION_KEYS.has(key as ProductInfoSectionKey);
}
