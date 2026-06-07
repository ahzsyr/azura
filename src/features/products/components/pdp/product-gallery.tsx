"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Product } from "../../types";
import { normalizeProductCertifications } from "../../lib/product-certifications";

type Props = {
  product: Product;
  certHeading?: string;
};

type MediaItem =
  | { kind: "image"; url: string; alt: string; index: number }
  | { kind: "video"; url: string; alt: string; index: number };

function ZoomCloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ZoomPrevIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ZoomNextIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ProductGallery({ product, certHeading = "Certified partner" }: Props) {
  const title = product.productTitle || product.name || "Product";
  const images = product.media?.images ?? [];
  const videos = product.media?.videos ?? [];
  const primaryIndex = Math.max(0, images.findIndex((img) => img.type === "main"));

  const modelFile = product.media?.files?.find((f) => {
    const row = f as { type?: string; url?: string };
    return row.type === "3d_model" && typeof row.url === "string" && row.url.trim();
  });
  const model3dUrl =
    typeof modelFile === "object" && modelFile && "url" in modelFile
      ? String((modelFile as { url?: string }).url ?? "").trim()
      : "";
  const has3d = Boolean(product.media?.["3d_model"] || model3dUrl);
  const modelUrl = typeof product.media?.["3d_model"] === "string" ? product.media["3d_model"] : model3dUrl;

  const allMedia = useMemo<MediaItem[]>(() => {
    const items: MediaItem[] = [];
    images.forEach((img, i) => {
      if (img.url?.trim()) {
        items.push({ kind: "image", url: img.url, alt: img.alt || title, index: i });
      }
    });
    videos.forEach((vid, i) => {
      if (vid.url?.trim()) {
        items.push({ kind: "video", url: vid.url, alt: title, index: images.length + i });
      }
    });
    return items;
  }, [images, videos, title]);

  const imageMedia = useMemo(
    () => allMedia.filter((m): m is Extract<MediaItem, { kind: "image" }> => m.kind === "image"),
    [allMedia],
  );

  const [active, setActive] = useState(primaryIndex >= 0 && primaryIndex < allMedia.length ? primaryIndex : 0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomImageIndex, setZoomImageIndex] = useState(0);
  const [modelOpen, setModelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const hasMultiple = allMedia.length > 1;
  const hasMultipleImages = imageMedia.length > 1;
  const certs = useMemo(
    () => normalizeProductCertifications(product.certifications),
    [product.certifications],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalOpen = zoomOpen || modelOpen;

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const goPrev = useCallback(() => {
    setActive((i) => (i <= 0 ? allMedia.length - 1 : i - 1));
  }, [allMedia.length]);

  const goNext = useCallback(() => {
    setActive((i) => (i >= allMedia.length - 1 ? 0 : i + 1));
  }, [allMedia.length]);

  const openZoom = useCallback(() => {
    const currentItem = allMedia[active];
    if (!currentItem || currentItem.kind !== "image") return;
    const imageIdx = imageMedia.findIndex((img) => img.url === currentItem.url);
    setZoomImageIndex(imageIdx >= 0 ? imageIdx : 0);
    setZoomOpen(true);
  }, [active, allMedia, imageMedia]);

  const closeZoom = useCallback(() => setZoomOpen(false), []);

  const closeModel = useCallback(() => setModelOpen(false), []);

  const syncActiveFromZoomImage = useCallback(
    (imageIdx: number) => {
      const img = imageMedia[imageIdx];
      if (!img) return;
      const mediaIdx = allMedia.findIndex((m) => m.kind === "image" && m.url === img.url);
      if (mediaIdx >= 0) setActive(mediaIdx);
    },
    [allMedia, imageMedia],
  );

  const goZoomPrev = useCallback(() => {
    setZoomImageIndex((i) => {
      const next = i <= 0 ? imageMedia.length - 1 : i - 1;
      syncActiveFromZoomImage(next);
      return next;
    });
  }, [imageMedia.length, syncActiveFromZoomImage]);

  const goZoomNext = useCallback(() => {
    setZoomImageIndex((i) => {
      const next = i >= imageMedia.length - 1 ? 0 : i + 1;
      syncActiveFromZoomImage(next);
      return next;
    });
  }, [imageMedia.length, syncActiveFromZoomImage]);

  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeZoom();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goZoomPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goZoomNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomOpen, closeZoom, goZoomPrev, goZoomNext]);

  useEffect(() => {
    if (!modelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modelOpen, closeModel]);

  if (allMedia.length === 0) {
    return <div className="prd-gallery prd-gallery--empty" aria-hidden="true" />;
  }

  const zoomImage = imageMedia[zoomImageIndex] ?? imageMedia[0];

  const zoomModal =
    zoomOpen && zoomImage && mounted ? (
      <div
        className="prd-gallery__zoom-modal is-open"
        role="dialog"
        aria-modal="true"
        aria-label="Image zoom view"
      >
        <button
          type="button"
          className="prd-gallery__zoom-overlay"
          aria-label="Close zoom"
          onClick={closeZoom}
        />
        <div className="prd-gallery__zoom-container">
          <button type="button" className="prd-gallery__zoom-close" aria-label="Close zoom" onClick={closeZoom}>
            <ZoomCloseIcon />
          </button>
          <div className="prd-gallery__zoom-wrapper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="prd-gallery__zoom-image"
              src={zoomImage.url}
              alt={zoomImage.alt}
              decoding="async"
            />
            {hasMultipleImages ? (
              <>
                <button
                  type="button"
                  className="prd-gallery__zoom-prev"
                  aria-label="Previous image"
                  onClick={goZoomPrev}
                >
                  <ZoomPrevIcon />
                </button>
                <button
                  type="button"
                  className="prd-gallery__zoom-next"
                  aria-label="Next image"
                  onClick={goZoomNext}
                >
                  <ZoomNextIcon />
                </button>
              </>
            ) : null}
          </div>
          {hasMultipleImages ? (
            <div className="prd-gallery__zoom-counter">
              {zoomImageIndex + 1} / {imageMedia.length}
            </div>
          ) : null}
        </div>
      </div>
    ) : null;

  const modelModal =
    modelOpen && modelUrl && mounted ? (
      <div
        className="prd-gallery__3d-modal is-open"
        role="dialog"
        aria-modal="true"
        aria-label="3D product view"
      >
        <button type="button" className="prd-gallery__3d-overlay" aria-label="Close 3D view" onClick={closeModel} />
        <div className="prd-gallery__3d-panel">
          <button type="button" className="prd-gallery__3d-close" aria-label="Close 3D view" onClick={closeModel}>
            ×
          </button>
          <iframe src={modelUrl} title={`3D view: ${title}`} className="prd-gallery__3d-frame" loading="lazy" />
        </div>
      </div>
    ) : null;

  return (
    <div className="prd-gallery-wrap">
      <section className="prd-gallery" data-product-gallery>
        <div className="prd-gallery__main-wrapper">
          <div className="prd-gallery__main" role="region" aria-label="Product media viewer">
            {allMedia.map((media, index) => (
              <div
                key={`${media.kind}-${media.url}-${index}`}
                className={`prd-gallery__asset-wrapper${index === active ? " is-active" : ""}`}
                data-gallery-item
                data-kind={media.kind}
                data-index={index}
              >
                {media.kind === "image" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="prd-gallery__asset prd-gallery__asset--image"
                      src={media.url}
                      alt={media.alt}
                      loading={index === active ? "eager" : "lazy"}
                      fetchPriority={index === active ? "high" : "low"}
                      decoding="async"
                      data-zoom-image
                      onClick={index === active ? openZoom : undefined}
                    />
                    {index === active ? (
                      <button
                        type="button"
                        className="prd-gallery__zoom-btn"
                        aria-label="Zoom image"
                        onClick={openZoom}
                      >
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="11" y1="8" x2="11" y2="14" />
                          <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </button>
                    ) : null}
                  </>
                ) : (
                  <iframe
                    className="prd-gallery__asset prd-gallery__asset--video"
                    src={media.url}
                    title={`Video for ${title}`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
              </div>
            ))}
          </div>

          {certs.length > 0 ? (
            <div className="prd-gallery__certs" aria-label={certHeading}>
              {certs.slice(0, 3).map((cert, idx) => (
                <span
                  key={`${cert.name}-${idx}`}
                  className="prd-gallery__cert-badge"
                  title={cert.name}
                >
                  {cert.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cert.image} alt={cert.name} className="prd-gallery__cert-img" loading="lazy" />
                  ) : (
                    cert.name
                  )}
                </span>
              ))}
            </div>
          ) : null}

          {hasMultiple ? (
            <div className="prd-gallery__toolbar" role="toolbar" aria-label="Gallery navigation">
              <button
                type="button"
                className="prd-gallery__nav prd-gallery__nav--prev"
                aria-label="Previous image"
                onClick={goPrev}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="prd-gallery__counter" data-gallery-counter>
                <span className="prd-gallery__counter-current">{active + 1}</span>
                <span className="prd-gallery__counter-sep">/</span>
                <span className="prd-gallery__counter-total">{allMedia.length}</span>
              </div>
              <button
                type="button"
                className="prd-gallery__nav prd-gallery__nav--next"
                aria-label="Next image"
                onClick={goNext}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              {has3d ? (
                <button
                  type="button"
                  className="prd-gallery__3d-btn"
                  aria-label="Open 3D view"
                  onClick={() => setModelOpen(true)}
                >
                  3D
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasMultiple ? (
          <div className="prd-gallery__thumbs" role="tablist" aria-label="Product thumbnails">
            {allMedia.map((media, index) => (
              <button
                key={`thumb-${media.url}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === active}
                className={`prd-gallery__thumb${index === active ? " is-active" : ""}${media.kind === "video" ? " prd-gallery__thumb--video" : ""}`}
                onClick={() => setActive(index)}
              >
                {media.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media.url} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="prd-gallery__thumb-play" aria-hidden="true">
                    ▶
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {mounted && zoomModal ? createPortal(zoomModal, document.body) : null}
      {mounted && modelModal ? createPortal(modelModal, document.body) : null}
    </div>
  );
}
