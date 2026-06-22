"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { isAllowedNextImageSrc, normalizeRemoteImageUrl } from "@/lib/config/next-image";
import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import {
  useProductPageViewport,
  type ProductPageViewport,
} from "@/features/products/lib/product-pdp-breakpoints";

type QuickViewData = {
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
};

type Props = {
  slug: string | null;
  localePrefix: string;
  onClose: () => void;
};

export function ProductQuickViewModal({ slug, localePrefix, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<QuickViewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const viewport = useProductPageViewport();
  const cardDisplay = useMemo(
    () => data?.cardDisplayByViewport?.[viewport],
    [data?.cardDisplayByViewport, viewport],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!slug) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setImgFailed(false);
    fetch(`/api/products/${encodeURIComponent(slug)}/card-preview?locale=${encodeURIComponent(localePrefix)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load preview");
        return res.json() as Promise<QuickViewData>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, localePrefix]);

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
  }, [slug, onKeyDown, mounted]);

  if (!slug || !mounted) return null;

  const rawImgSrc = data?.primary_image
    ? normalizeRemoteImageUrl(data.primary_image) ?? data.primary_image
    : undefined;
  const imgSrc = rawImgSrc && !imgFailed ? rawImgSrc : DEFAULT_MEDIA_PLACEHOLDER;

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
        {loading ? <p className="pl-qview__loading">Loading…</p> : null}
        {error ? <p className="pl-qview__error">{error}</p> : null}
        {data ? (
          <div className="pl-qview__body">
            <div className="pl-qview__media">
              <Image
                src={imgSrc}
                alt={data.name}
                width={480}
                height={480}
                className="pl-qview__img"
                unoptimized={rawImgSrc && !imgFailed ? !isAllowedNextImageSrc(rawImgSrc) : true}
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
              {cardDisplay?.showRating !== false &&
              data.rating != null &&
              data.rating > 0 ? (
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
              <Link href={`/products/${data.slug}`} className="pl-qview__link" onClick={onClose}>
                View full details
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
