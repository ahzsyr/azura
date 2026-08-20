"use client";

import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";
import { normalizeRemoteImageUrl, shouldOptimizeNextImage } from "@/lib/config/next-image";
import type { Product } from "@/features/products/types";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import {
  colorFromSelected,
  imagesForSelectedVariations,
  itemVariationTags,
  normalizeSelected,
  sectionsMediaForSelection,
  videosForSelectedVariations,
  type VariationSelection,
} from "@/features/products/lib/product-variation-media";
import { resolveModel3d } from "@/features/products/lib/unifi-product-sections";
import { UniFiModelViewer } from "./unifi-model-viewer";
import { UniFiGalleryZoom } from "./unifi-gallery-zoom";

export type UniFiGalleryMode = "3d" | "technical" | "gallery";

type Props = {
  product: Product;
  title: string;
  display: ResolvedProductPageDisplay;
  selectedVariations?: VariationSelection;
};

type GalleryItem =
  | { kind: "image"; url: string; alt: string }
  | { kind: "video"; url: string; alt: string; poster?: string };

function TechnicalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="1.5" />
      <rect x="8" y="8" width="8" height="8" rx="0.5" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function UniFiGallery({ product, title, display, selectedVariations }: Props) {
  const selectedLabel = colorFromSelected(selectedVariations);
  const images = useMemo(
    () =>
      imagesForSelectedVariations(product, selectedVariations)
        .filter((img) => img.url?.trim())
        .map((img) => ({
          kind: "image" as const,
          url: normalizeRemoteImageUrl(img.url!) ?? img.url!,
          alt: img.alt || selectedLabel || title,
        })),
    [product, selectedVariations, selectedLabel, title],
  );
  const videos = useMemo(
    () =>
      videosForSelectedVariations(product, selectedVariations)
        .filter((vid) => vid.url?.trim())
        .map((vid) => ({
          kind: "video" as const,
          url: vid.url!,
          alt: title,
          poster: vid.poster ? normalizeRemoteImageUrl(vid.poster) ?? vid.poster : undefined,
        })),
    [product, selectedVariations, title],
  );
  const galleryItems = useMemo<GalleryItem[]>(() => [...images, ...videos], [images, videos]);

  const technicalImages = useMemo(() => {
    const fromTech = sectionsMediaForSelection(product, "technical", selectedVariations)
      .filter((item) => item.url?.trim())
      .map((item) => ({
        kind: "image" as const,
        url: normalizeRemoteImageUrl(item.url!) ?? item.url!,
        alt: item.alt || selectedLabel || title,
      }));
    if (fromTech.length) return fromTech;
    return images.slice(0, 1);
  }, [product, selectedVariations, selectedLabel, title, images]);

  const model = useMemo(() => resolveModel3d(product), [product]);
  const want = normalizeSelected(selectedVariations);
  const variant =
    model?.variants?.find((item) => {
      const tags = itemVariationTags(item);
      if (!Object.keys(tags).length) return false;
      return Object.entries(tags).every((entry) => !(entry[0] in want) || want[entry[0]] === entry[1]);
    }) ?? model?.variants?.[0];

  const can3d = display.modelViewer.enabled && Boolean(model?.url || variant?.thumbnail);
  const canTechnical = technicalImages.length > 0;
  const canGallery = galleryItems.length > 0;

  const [mode, setMode] = useState<UniFiGalleryMode>(() => {
    if (can3d) return "3d";
    if (canGallery) return "gallery";
    return "technical";
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [techIndex, setTechIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const selectionKey = `${JSON.stringify(selectedVariations ?? {})}:${mode}`;
  const [activeSelection, setActiveSelection] = useState(selectionKey);
  if (activeSelection !== selectionKey) {
    setActiveSelection(selectionKey);
    setActiveIndex(0);
    setTechIndex(0);
  }

  const activeMode: UniFiGalleryMode =
    (mode === "3d" && can3d) || (mode === "technical" && canTechnical) || (mode === "gallery" && canGallery)
      ? mode
      : can3d
        ? "3d"
        : canGallery
          ? "gallery"
          : "technical";

  const active = galleryItems[activeIndex] ?? galleryItems[0];
  const activeTech = technicalImages[techIndex] ?? technicalImages[0];
  const zoomSources = activeMode === "technical" ? technicalImages : images;
  const zoomImage = zoomSources[zoomIndex] ?? zoomSources[0];
  // Keep the thumb rail mounted in 3D so the main stage stays aligned with gallery mode.
  const showGalleryThumbs = galleryItems.length > 1;
  const showTechnicalThumbs = activeMode === "technical" && technicalImages.length > 1;
  const showThumbs = activeMode === "technical" ? showTechnicalThumbs : showGalleryThumbs;
  const showThumbSpacer = activeMode === "3d" && !showGalleryThumbs && canGallery;
  const showZoom =
    (activeMode === "gallery" && active?.kind === "image") ||
    (activeMode === "technical" && Boolean(activeTech));

  const imageItems = images;
  const overflowCount = Math.max(0, imageItems.length - 3);
  const visibleThumbs = imageItems.slice(0, overflowCount > 0 ? 3 : imageItems.length);
  const videoCount = videos.length;

  const openZoom = (index: number) => {
    setZoomIndex(Math.max(0, index));
    setZoomOpen(true);
  };

  const selectGalleryThumb = (index: number) => {
    setActiveIndex(index);
    if (activeMode !== "gallery") setMode("gallery");
  };

  return (
    <div className="unifi-gallery">
      <div
        className={`unifi-gallery__layout${showThumbs || showThumbSpacer ? " unifi-gallery__layout--with-thumbs" : ""}`}
        data-mode={activeMode}
      >
        {showThumbs ? (
          <div className="unifi-gallery__thumbs" aria-label={activeMode === "technical" ? "Technical thumbnails" : "Product thumbnails"}>
            {activeMode === "technical"
              ? technicalImages.slice(0, 6).map((item, i) => (
                  <button
                    key={item.url}
                    type="button"
                    className={`unifi-gallery__thumb${i === techIndex ? " unifi-gallery__thumb--active" : ""}`}
                    onClick={() => setTechIndex(i)}
                    aria-label={`View technical image ${i + 1}`}
                  >
                    <Image
                      src={item.url}
                      alt=""
                      width={80}
                      height={80}
                      unoptimized={!shouldOptimizeNextImage(item.url)}
                    />
                  </button>
                ))
              : (
                <>
                  {visibleThumbs.map((item, i) => (
                    <button
                      key={item.url}
                      type="button"
                      className={`unifi-gallery__thumb${activeMode === "gallery" && i === activeIndex ? " unifi-gallery__thumb--active" : ""}`}
                      onClick={() => selectGalleryThumb(i)}
                      aria-label={`View image ${i + 1}`}
                    >
                      <Image
                        src={item.url}
                        alt=""
                        width={80}
                        height={80}
                        unoptimized={!shouldOptimizeNextImage(item.url)}
                      />
                    </button>
                  ))}
                  {overflowCount > 0 && imageItems[3] ? (
                    <button
                      type="button"
                      className={`unifi-gallery__thumb${activeMode === "gallery" && activeIndex >= 3 && activeIndex < imageItems.length ? " unifi-gallery__thumb--active" : ""}`}
                      onClick={() => selectGalleryThumb(3)}
                      aria-label={`View ${overflowCount} more`}
                    >
                      <Image
                        src={imageItems[3].url}
                        alt=""
                        width={80}
                        height={80}
                        unoptimized={!shouldOptimizeNextImage(imageItems[3].url)}
                      />
                      <span className="unifi-gallery__thumb-more">+{overflowCount} more</span>
                    </button>
                  ) : null}
                  {videoCount > 0 ? (
                    <button
                      type="button"
                      className={`unifi-gallery__thumb unifi-gallery__thumb--video${activeMode === "gallery" && active?.kind === "video" ? " unifi-gallery__thumb--active" : ""}`}
                      onClick={() => selectGalleryThumb(imageItems.length)}
                      aria-label={`${videoCount} video`}
                    >
                      {videos[0]?.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={videos[0].poster} alt="" />
                      ) : (
                        <span className="unifi-gallery__thumb-video-fallback" />
                      )}
                      <span className="unifi-gallery__thumb-play" aria-hidden>
                        ▶
                      </span>
                      <span className="unifi-gallery__thumb-more unifi-gallery__thumb-more--caption">
                        {videoCount} {videoCount === 1 ? "video" : "videos"}
                      </span>
                    </button>
                  ) : null}
                </>
              )}
          </div>
        ) : showThumbSpacer ? (
          <div className="unifi-gallery__thumbs unifi-gallery__thumbs--spacer" aria-hidden="true" />
        ) : null}

        <div className="unifi-gallery__main">
          {activeMode === "3d" && model ? (
            <UniFiModelViewer model={model} variant={variant} alt={selectedLabel || title} />
          ) : activeMode === "technical" && activeTech ? (
            <Image
              src={activeTech.url}
              alt={activeTech.alt}
              fill
              className="unifi-gallery__main-img"
              sizes="(max-width: 832px) 100vw, 50vw"
              unoptimized={!shouldOptimizeNextImage(activeTech.url)}
              priority
            />
          ) : active?.kind === "video" ? (
            <video
              className="unifi-gallery__main-video"
              src={active.url}
              poster={active.poster}
              controls
              playsInline
              preload="metadata"
            />
          ) : active?.url ? (
            <Image
              src={active.url}
              alt={active.alt || title}
              fill
              className="unifi-gallery__main-img"
              sizes="(max-width: 832px) 100vw, 50vw"
              unoptimized={!shouldOptimizeNextImage(active.url)}
              priority
            />
          ) : (
            <div className="unifi-gallery unifi-gallery--empty">No images</div>
          )}

          {showZoom ? (
            <button
              type="button"
              className="unifi-gallery__zoom-btn"
              aria-label="Zoom image"
              onClick={() =>
                openZoom(
                  activeMode === "technical"
                    ? techIndex
                    : Math.max(0, images.findIndex((item) => item.url === active?.url)),
                )
              }
            >
              <Maximize2 size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          ) : null}

          {can3d || canTechnical || canGallery ? (
            <div className="unifi-gallery__mode-switch" role="tablist" aria-label="Media mode">
              {can3d ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === "3d"}
                  className={`unifi-gallery__mode${activeMode === "3d" ? " unifi-gallery__mode--active" : ""}`}
                  onClick={() => setMode("3d")}
                >
                  3D
                </button>
              ) : null}
              {canTechnical ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === "technical"}
                  className={`unifi-gallery__mode${activeMode === "technical" ? " unifi-gallery__mode--active" : ""}`}
                  onClick={() => setMode("technical")}
                  aria-label="Technical photos"
                  title="Technical photos"
                >
                  <TechnicalIcon />
                </button>
              ) : null}
              {canGallery ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMode === "gallery"}
                  className={`unifi-gallery__mode${activeMode === "gallery" ? " unifi-gallery__mode--active" : ""}`}
                  onClick={() => setMode("gallery")}
                  aria-label="Gallery"
                  title="Gallery"
                >
                  <GalleryIcon />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {zoomImage ? (
        <UniFiGalleryZoom
          open={zoomOpen}
          src={zoomImage.url}
          alt={zoomImage.alt}
          onClose={() => setZoomOpen(false)}
          onPrev={
            zoomSources.length > 1
              ? () => setZoomIndex((current) => (current <= 0 ? zoomSources.length - 1 : current - 1))
              : undefined
          }
          onNext={
            zoomSources.length > 1
              ? () => setZoomIndex((current) => (current >= zoomSources.length - 1 ? 0 : current + 1))
              : undefined
          }
          counter={zoomSources.length > 1 ? `${zoomIndex + 1} / ${zoomSources.length}` : undefined}
        />
      ) : null}
    </div>
  );
}
