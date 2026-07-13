"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { normalizeRemoteImageUrl, shouldOptimizeNextImage } from "@/lib/config/next-image";
import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import { ProductBuyNowCardButton } from "@/features/products/components/listing/product-buy-now-card-button";
import { ProductCtaButton } from "@/features/products/components/pdp/product-cta-button";
import { productLinkContextFromProduct } from "@/features/products/lib/product-whatsapp-link";
import { useProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";
import {
  fetchQuickViewData,
  getCachedQuickViewData,
} from "./quick-view-data";
import type { QuickViewCommerceFlags, QuickViewData, QuickViewSeed } from "./quick-view-types";

type Props = {
  slug: string | null;
  localePrefix: string;
  seed?: QuickViewSeed | null;
  onClose: () => void;
};

function preloadImage(url: string | undefined): void {
  if (!url || typeof window === "undefined") return;
  const src = normalizeRemoteImageUrl(url) ?? url;
  const img = new window.Image();
  img.decoding = "async";
  img.src = src;
}

function QuickViewSkeleton() {
  return (
    <div className="pl-qview__skeleton" aria-hidden="true">
      <div className="pl-qview__sk-media" />
      <div className="pl-qview__sk-info">
        <span className="pl-qview__sk-line pl-qview__sk-line--sm" />
        <span className="pl-qview__sk-line pl-qview__sk-line--lg" />
        <span className="pl-qview__sk-line pl-qview__sk-line--md" />
        <span className="pl-qview__sk-line pl-qview__sk-line--md" />
        <div className="pl-qview__sk-actions">
          <span className="pl-qview__sk-btn" />
          <span className="pl-qview__sk-btn" />
        </div>
      </div>
    </div>
  );
}

function QuickViewBody({
  data,
  cardDisplay,
  commerce,
  localePrefix,
  refreshing,
  onNavigate,
}: {
  data: QuickViewData;
  cardDisplay?: ResolvedProductCardDisplay;
  commerce?: QuickViewCommerceFlags;
  localePrefix: string;
  refreshing?: boolean;
  onNavigate: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [data.primary_image, data.slug]);

  const rawImgSrc = data.primary_image
    ? normalizeRemoteImageUrl(data.primary_image) ?? data.primary_image
    : undefined;
  const imgSrc = rawImgSrc && !imgFailed ? rawImgSrc : DEFAULT_MEDIA_PLACEHOLDER;

  return (
    <div className={`pl-qview__body${refreshing ? " pl-qview__body--refreshing" : ""}`}>
      <div className="pl-qview__media">
        <Image
          src={imgSrc}
          alt={data.name}
          width={480}
          height={480}
          className="pl-qview__img"
          priority
          sizes="(max-width: 640px) 100vw, 360px"
          unoptimized={rawImgSrc && !imgFailed ? !shouldOptimizeNextImage(rawImgSrc) : true}
          onError={() => setImgFailed(true)}
        />
      </div>
      <div className="pl-qview__info">
        {data.brand && cardDisplay?.showBrand !== false ? (
          <small className="pl-qview__brand">{data.brand}</small>
        ) : null}
        <h3 className="pl-qview__name">{data.name}</h3>
        {cardDisplay?.showShortDescription !== false && data.short_description ? (
          <p className="pl-qview__desc">{data.short_description}</p>
        ) : null}
        {cardDisplay?.showRating !== false && data.rating != null && data.rating > 0 ? (
          <p className="pl-qview__rating">
            {data.rating.toFixed(1)}
            {data.reviews_count != null ? ` (${data.reviews_count})` : ""}
          </p>
        ) : null}
        {cardDisplay?.showPrice !== false ? (
          <p className="pl-qview__price">
            {data.price.currency} {data.price.value.toFixed(2)}
          </p>
        ) : null}
        {cardDisplay?.showStock !== false && !data.in_stock ? (
          <span className="pl-qview__stock">Out of stock</span>
        ) : null}
        <div className="pl-qview__actions">
          {commerce?.showBuyNow && commerce.buyNowHref && data.buyNow ? (
            <ProductBuyNowCardButton
              config={data.buyNow}
              href={commerce.buyNowHref}
              className="pl-qview__buy-now"
            />
          ) : null}
          {commerce?.showProductCta && data.productCta ? (
            <ProductCtaButton
              config={data.productCta}
              localePrefix={localePrefix}
              placement="card"
              className="pl-qview__cta"
              linkContext={productLinkContextFromProduct({
                productTitle: data.name,
                name: data.name,
                slug: data.slug,
              })}
            />
          ) : null}
          <Link href={`/products/${data.slug}`} className="pl-qview__link" onClick={onNavigate}>
            View full details
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProductQuickViewModal({ slug, localePrefix, seed, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<QuickViewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewport = useProductPageViewport();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!slug) {
      setData(null);
      setError(null);
      return;
    }

    const cached = getCachedQuickViewData(slug, localePrefix);
    setData(cached);
    if (cached) {
      preloadImage(cached.primary_image);
    } else if (seed?.slug === slug) {
      preloadImage(seed.primary_image);
    }

    let cancelled = false;
    setLoading(!cached);
    setError(null);

    fetchQuickViewData(slug, localePrefix)
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e: Error) => {
        if (!cancelled && !cached && !(seed?.slug === slug)) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, localePrefix, seed?.slug, seed?.primary_image]);

  const displayData = useMemo((): QuickViewData | null => {
    if (data) return data;
    if (slug && seed && seed.slug === slug) {
      return {
        slug: seed.slug,
        name: seed.name,
        brand: seed.brand,
        short_description: seed.short_description,
        price: seed.price,
        old_price: seed.old_price,
        primary_image: seed.primary_image,
        gallery_images: seed.gallery_images,
        in_stock: seed.in_stock,
        rating: seed.rating,
        reviews_count: seed.reviews_count,
      };
    }
    return null;
  }, [data, seed, slug]);

  const cardDisplay = useMemo(() => {
    return data?.cardDisplayByViewport?.[viewport] ?? seed?.cardDisplay;
  }, [data?.cardDisplayByViewport, seed?.cardDisplay, viewport]);

  const commerce = useMemo((): QuickViewCommerceFlags | undefined => {
    return data?.commerceByViewport?.[viewport] ?? seed?.commerce;
  }, [data?.commerceByViewport, seed?.commerce, viewport]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!slug) return;
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [slug, onKeyDown]);

  if (!slug || !mounted) return null;

  const showSkeleton = loading && !displayData;
  const showBody = Boolean(displayData);
  const refreshing = loading && Boolean(displayData);

  return createPortal(
    <div className="pl-qview" role="dialog" aria-modal="true" aria-labelledby="pl-qview-title">
      <button type="button" className="pl-qview__backdrop" aria-label="Close" onClick={onClose} />
      <div className="pl-qview__panel">
        <header className="pl-qview__head">
          <h2 id="pl-qview-title" className="pl-qview__title">
            Quick view
          </h2>
          <button type="button" className="pl-qview__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="pl-qview__content" aria-busy={loading} aria-live="polite">
          {showSkeleton ? <QuickViewSkeleton /> : null}
          {error && !showBody ? (
            <div className="pl-qview__error-wrap">
              <p className="pl-qview__error">{error}</p>
              <button type="button" className="pl-qview__retry" onClick={onClose}>
                Close
              </button>
            </div>
          ) : null}
          {showBody && displayData ? (
            <QuickViewBody
              data={{
                ...displayData,
                buyNow: data?.buyNow ?? seed?.buyNow,
                productCta: data?.productCta ?? seed?.productCta,
              }}
              cardDisplay={cardDisplay}
              commerce={commerce}
              localePrefix={localePrefix}
              refreshing={refreshing}
              onNavigate={onClose}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
