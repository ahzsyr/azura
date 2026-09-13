"use client";

import Image from "next/image";
import { useMemo, useState, useCallback } from "react";
import { Link as LocaleLink } from "@/i18n/navigation";
import { sharedElementAttrs } from "@/lib/navigation/shared-elements";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { normalizeRemoteImageUrl, shouldOptimizeNextImage } from "@/lib/config/next-image";
import { resolveMediaFlipContent } from "../resolve-media-flip-content";
import { resolveFlipBackImageSrc } from "../resolve-flip-back-image";
import type { ProductCardRenderContext } from "./product-card-context";
import { useMediaFlipTouch } from "./use-media-flip-touch";

type Props = {
  ctx: ProductCardRenderContext;
};

function normalizeSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  return normalizeRemoteImageUrl(src) ?? src;
}

function FlipFrontMedia({
  ctx,
  alt,
}: {
  ctx: ProductCardRenderContext;
  alt: string;
}) {
  const { product, design, priority } = ctx;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const primarySrc = normalizeSrc(product.primary_image);
  const imageSrc = primarySrc && !failed ? primarySrc : DEFAULT_MEDIA_PLACEHOLDER;
  const imageUnoptimized = !shouldOptimizeNextImage(imageSrc);
  const imageShared = sharedElementAttrs("product", product.slug, "image");

  const onImageLoad = useCallback(() => setLoaded(true), []);
  const onImageError = useCallback(() => {
    setFailed(true);
    setLoaded(true);
  }, []);

  return (
    <div
      className={[
        "pl-card__flip-front-media",
        design.media.showSkeleton && primarySrc && !loaded && !failed
          ? "pl-card__flip-front-media--loading"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        className="pl-card__flip-front-img"
        src={imageSrc}
        alt={alt}
        width={480}
        height={480}
        sizes={IMAGE_SIZES.card}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        unoptimized={imageUnoptimized}
        data-priority-img={priority ? "" : undefined}
        data-shared-element={imageShared["data-shared-element"]}
        data-shared-element-type={imageShared["data-shared-element-type"]}
        data-shared-element-id={imageShared["data-shared-element-id"]}
        style={imageShared.style}
        onLoad={onImageLoad}
        onError={onImageError}
      />
      {design.media.showSkeleton && primarySrc && !loaded && !failed ? (
        <span className="pl-card__media-skeleton" aria-hidden="true" />
      ) : null}
    </div>
  );
}

function FlipBackMedia({ ctx }: { ctx: ProductCardRenderContext }) {
  const { priority } = ctx;
  const [failed, setFailed] = useState(false);
  const backSrc = normalizeSrc(resolveFlipBackImageSrc(ctx.product));
  const imageSrc = backSrc && !failed ? backSrc : DEFAULT_MEDIA_PLACEHOLDER;
  const imageUnoptimized = !shouldOptimizeNextImage(imageSrc);

  const onImageError = useCallback(() => setFailed(true), []);

  return (
    <div className="pl-card__flip-back-media" aria-hidden="true">
      <Image
        className="pl-card__flip-back-img"
        src={imageSrc}
        alt=""
        width={480}
        height={480}
        sizes={IMAGE_SIZES.card}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        unoptimized={imageUnoptimized}
        onError={onImageError}
      />
      <span className="pl-card__flip-back-overlay" />
    </div>
  );
}

function FlipFrontContent({
  brand,
  title,
  description,
  showBrand,
  titleShared,
}: {
  brand: string;
  title: string;
  description: string;
  showBrand: boolean;
  titleShared: ReturnType<typeof sharedElementAttrs>;
}) {
  return (
    <div className="pl-card__flip-front-content">
      {showBrand && brand ? (
        <small className="pl-card__brand pl-card__flip-brand">{brand}</small>
      ) : null}
      <h3
        className="pl-card__title pl-card__flip-title ui-text-product-card"
        data-shared-element={titleShared["data-shared-element"]}
        data-shared-element-type={titleShared["data-shared-element-type"]}
        data-shared-element-id={titleShared["data-shared-element-id"]}
        style={titleShared.style}
      >
        {title}
      </h3>
      {description ? (
        <p className="pl-card__desc pl-card__flip-desc">{description}</p>
      ) : (
        <p className="pl-card__desc pl-card__flip-desc pl-card__flip-desc--empty" aria-hidden="true">
          &nbsp;
        </p>
      )}
    </div>
  );
}

function FlipBackSummary({
  category,
  productType,
  benefits,
  idealFor,
  showCategory,
}: {
  category: string;
  productType: string;
  benefits: string[];
  idealFor: string[];
  showCategory: boolean;
}) {
  const idealForLine = idealFor.join(" · ");

  return (
    <div className="pl-card__flip-back-summary">
      {showCategory && category ? (
        <>
          <small className="pl-card__flip-back-category">{category}</small>
          <span className="pl-card__flip-back-divider" aria-hidden="true" />
        </>
      ) : null}
      {productType ? <p className="pl-card__flip-back-type">{productType}</p> : null}
      {benefits.length > 0 ? (
        <ul className="pl-card__flip-benefits" aria-label="Key benefits">
          {benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      ) : null}
      {idealForLine ? (
        <div className="pl-card__flip-ideal">
          <span className="pl-card__flip-ideal-label">Ideal for</span>
          <p className="pl-card__flip-ideal-values">{idealForLine}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Front: image + identity. Back: gallery image + summary. Both faces link to the PDP. */
export function ProductCardMediaFlip({ ctx }: Props) {
  const { product, cardDisplay, design, navHref, linkPrefetch } = ctx;
  const { isFlipped, isBackExposed, sceneRef } = useMediaFlipTouch();

  const content = useMemo(() => resolveMediaFlipContent(product), [product]);
  const titleShared = sharedElementAttrs("product", product.slug, "title");
  const showBrand = cardDisplay.showBrand && Boolean(content.front.brand);
  const showCategory = design.showCategory && Boolean(content.back.category);
  const productAriaLabel = `${content.front.title} — view product`;

  return (
    <div
      ref={sceneRef}
      className="pl-card__flip-scene"
      data-flipped={isFlipped ? "" : undefined}
      data-back-exposed={isBackExposed ? "" : undefined}
    >
      <div className="pl-card__flip-inner">
        <div
          className="pl-card__flip-face pl-card__flip-face--front"
          inert={isFlipped ? true : undefined}
        >
          <LocaleLink
            href={navHref}
            prefetch={linkPrefetch}
            className="pl-card__flip-front-link"
            aria-label={productAriaLabel}
          >
            <FlipFrontMedia ctx={ctx} alt={content.front.title} />
            <FlipFrontContent
              brand={content.front.brand}
              title={content.front.title}
              description={content.front.description}
              showBrand={showBrand}
              titleShared={titleShared}
            />
          </LocaleLink>
        </div>

        <div
          className="pl-card__flip-face pl-card__flip-face--back"
          inert={!isBackExposed ? true : undefined}
        >
          <LocaleLink
            href={navHref}
            prefetch={linkPrefetch}
            className="pl-card__flip-back-link"
            aria-label={productAriaLabel}
            tabIndex={isBackExposed ? undefined : -1}
          >
            <FlipBackMedia ctx={ctx} />
            <FlipBackSummary
              category={content.back.category}
              productType={content.back.productType}
              benefits={content.back.benefits}
              idealFor={content.back.idealFor}
              showCategory={showCategory}
            />
          </LocaleLink>
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
