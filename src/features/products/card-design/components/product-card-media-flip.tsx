"use client";

import Image from "next/image";
import { Link as LocaleLink } from "@/i18n/navigation";
import { sharedElementAttrs } from "@/lib/navigation/shared-elements";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { normalizeRemoteImageUrl, shouldOptimizeNextImage } from "@/lib/config/next-image";
import type { ProductCardRenderContext } from "./product-card-context";
import { ProductCardMedia } from "./product-card-media";

type Props = {
  ctx: ProductCardRenderContext;
};

function normalizeSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  return normalizeRemoteImageUrl(src) ?? src;
}

function resolveFlipBackImageSrc(product: ProductCardRenderContext["product"]): string {
  const gallery = [
    normalizeSrc(product.primary_image),
    ...(product.gallery_images ?? []).map(normalizeSrc),
    normalizeSrc(product.secondary_image),
  ].filter((src, i, arr): src is string => Boolean(src) && arr.indexOf(src) === i);

  // Prefer a second photo when available; otherwise reuse the primary.
  return gallery[1] ?? gallery[0] ?? DEFAULT_MEDIA_PLACEHOLDER;
}

/** Front: photo + gradient brand/title. Back: faded photo + specs. */
export function ProductCardMediaFlip({ ctx }: Props) {
  const { product, cardDisplay, design, navHref, linkPrefetch } = ctx;
  const titleShared = sharedElementAttrs("product", product.slug, "title");
  const showBrand = cardDisplay.showBrand && Boolean(product.brand);
  const showCategory = design.showCategory && Boolean(product.category);
  const showDescription = Boolean(product.short_description);
  const showFeatures = product.tags.length > 0;

  const backSrc = resolveFlipBackImageSrc(product);
  const backUnoptimized = !shouldOptimizeNextImage(backSrc);

  return (
    <div className="pl-card__flip-scene">
      <div className="pl-card__flip-inner">
        <div className="pl-card__flip-face pl-card__flip-face--front">
          <ProductCardMedia
            ctx={ctx}
            overlay={
              <div className="pl-card__media-caption">
                {showBrand ? <small className="pl-card__brand">{product.brand}</small> : null}
                <h3
                  className="pl-card__title ui-text-product-card"
                  data-shared-element={titleShared["data-shared-element"]}
                  data-shared-element-type={titleShared["data-shared-element-type"]}
                  data-shared-element-id={titleShared["data-shared-element-id"]}
                  style={titleShared.style}
                >
                  {product.name}
                </h3>
              </div>
            }
          />
        </div>
        <div className="pl-card__flip-face pl-card__flip-face--back" aria-hidden="true">
          <LocaleLink
            href={navHref}
            prefetch={linkPrefetch}
            className="pl-card__flip-back-link"
            aria-label={`${product.name} — view product`}
          />
          <div className="pl-card__flip-back-media" aria-hidden="true">
            <Image
              className="pl-card__flip-back-img"
              src={backSrc}
              alt=""
              width={480}
              height={480}
              sizes={IMAGE_SIZES.card}
              loading="lazy"
              unoptimized={backUnoptimized}
            />
            <span className="pl-card__flip-back-veil" />
          </div>
          <div className="pl-card__flip-specs">
            {showCategory ? (
              <small className="pl-card__category">{product.category}</small>
            ) : null}
            {showDescription ? (
              <p className="pl-card__desc">{product.short_description}</p>
            ) : null}
            {showFeatures ? (
              <ul className="pl-card__features" aria-label="Product highlights">
                {product.tags.slice(0, 3).map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function isMediaFlipStyle(style: string): boolean {
  return style === "media_flip";
}

/** Slots rendered inside the flip scene — skip in ProductCardContent. */
export const MEDIA_FLIP_SKIP_SLOTS = [
  "brand",
  "title",
  "category",
  "description",
  "features",
] as const;
