"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  counter?: string;
};

function ZoomCloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function UniFiGalleryZoom({ open, src, alt, onClose, onPrev, onNext, counter }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev?.();
      if (event.key === "ArrowRight") onNext?.();
    },
    [open, onClose, onPrev, onNext],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div className="prd-gallery__zoom-modal is-open" role="dialog" aria-modal="true" aria-label="Image zoom view">
      <button type="button" className="prd-gallery__zoom-overlay" aria-label="Close zoom" onClick={onClose} />
      <div className="prd-gallery__zoom-container">
        <button type="button" className="prd-gallery__zoom-close" aria-label="Close zoom" onClick={onClose}>
          <ZoomCloseIcon />
        </button>
        <div className="prd-gallery__zoom-wrapper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="prd-gallery__zoom-image" src={src} alt={alt} decoding="async" />
          {onPrev ? (
            <button type="button" className="prd-gallery__zoom-prev" aria-label="Previous image" onClick={onPrev}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : null}
          {onNext ? (
            <button type="button" className="prd-gallery__zoom-next" aria-label="Next image" onClick={onNext}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : null}
        </div>
        {counter ? <div className="prd-gallery__zoom-counter">{counter}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
