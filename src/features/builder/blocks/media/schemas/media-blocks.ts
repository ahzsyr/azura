import { z } from "zod";

export function newId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const videoHeroSlideSchema = z.object({
  id: z.string(),
  videoUrl: z.string().default(""),
  videoMediaAssetId: z.string().default(""),
  imageUrl: z.string().default(""),
  imageMediaAssetId: z.string().default(""),
  posterUrl: z.string().default(""),
  caption: z.string().default(""),
});

export const videoHeroPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  badge: z.string().default(""),
  ctaLabel: z.string().default(""),
  ctaHref: z.string().default("/contact"),
  secondaryCtaLabel: z.string().default(""),
  secondaryCtaHref: z.string().default(""),
  secondaryCtaVariant: z.enum(["outline", "ghost", "gold"]).default("outline"),
  mediaMode: z.enum(["single", "featured"]).default("single"),
  videoUrl: z.string().default(""),
  videoMediaAssetId: z.string().default(""),
  posterUrl: z.string().default(""),
  captionTrackUrl: z.string().default(""),
  slides: z.array(videoHeroSlideSchema).default([]),
  layout: z.enum(["fullBleed", "centered", "split"]).default("fullBleed"),
  align: z.enum(["left", "center", "right"]).default("center"),
  minHeight: z.enum(["50vh", "70vh", "85vh"]).default("70vh"),
  autoplay: z.boolean().default(true),
  loop: z.boolean().default(true),
  muted: z.boolean().default(true),
  showControls: z.boolean().default(false),
  playsInline: z.boolean().default(true),
  overlayOpacity: z.coerce.number().min(0).max(100).default(55),
  overlayGradient: z.boolean().default(true),
  autoplaySlides: z.boolean().default(true),
  autoplaySlideMs: z.coerce.number().default(6000),
  showSlideDots: z.boolean().default(true),
  showSlideArrows: z.boolean().default(true),
});

export const videoGalleryItemSchema = z.object({
  id: z.string(),
  videoUrl: z.string().default(""),
  videoMediaAssetId: z.string().default(""),
  embedUrl: z.string().default(""),
  thumbnailUrl: z.string().default(""),
  thumbnailMediaAssetId: z.string().default(""),
  title: z.string().default(""),
  category: z.string().default(""),
  playlistId: z.string().default(""),
});

export const videoGalleryPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  source: z.enum(["album", "inline"]).default("inline"),
  gallerySlug: z.string().default(""),
  items: z.array(videoGalleryItemSchema).default([]),
  columns: z.coerce
    .number()
    .pipe(z.union([z.literal(2), z.literal(3), z.literal(4)]))
    .default(3),
  layout: z.enum(["grid", "list"]).default("grid"),
  limit: z.coerce.number().default(0),
  enableLightbox: z.boolean().default(true),
  autoplayInGrid: z.boolean().default(false),
  showCategories: z.boolean().default(false),
  showControls: z.boolean().default(true),
  loop: z.boolean().default(false),
  preload: z.enum(["none", "metadata", "auto"]).default("metadata"),
});

export const hotspotItemSchema = z.object({
  id: z.string(),
  x: z.coerce.number().min(0).max(100).default(50),
  y: z.coerce.number().min(0).max(100).default(50),
  label: z.string().default(""),
  content: z.string().default(""),
  href: z.string().default(""),
  mediaUrl: z.string().default(""),
  mediaAssetId: z.string().default(""),
  tooltipPlacement: z.enum(["top", "bottom", "left", "right"]).default("top"),
});

export const interactiveHotspotsPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  imageUrl: z.string().default(""),
  mediaAssetId: z.string().default(""),
  interaction: z.enum(["click", "hover"]).default("click"),
  panelStyle: z.enum(["tooltip", "popover", "drawer"]).default("popover"),
  hotspots: z.array(hotspotItemSchema).default([]),
});

export const masonryGalleryItemSchema = z.object({
  id: z.string(),
  imageUrl: z.string().default(""),
  mediaAssetId: z.string().default(""),
  videoUrl: z.string().default(""),
  mediaKind: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
  alt: z.string().default(""),
  caption: z.string().default(""),
  category: z.string().default(""),
});

export const masonryGalleryPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  source: z.enum(["inline", "album"]).default("inline"),
  gallerySlug: z.string().default(""),
  items: z.array(masonryGalleryItemSchema).default([]),
  columns: z.coerce
    .number()
    .pipe(z.union([z.literal(2), z.literal(3), z.literal(4)]))
    .default(3),
  limit: z.coerce.number().default(0),
  enableLightbox: z.boolean().default(true),
  enableFilter: z.boolean().default(false),
  lazyLoad: z.boolean().default(true),
});

export type VideoHeroSlide = z.infer<typeof videoHeroSlideSchema>;
export type VideoGalleryItem = z.infer<typeof videoGalleryItemSchema>;
export type HotspotItem = z.infer<typeof hotspotItemSchema>;
export type MasonryGalleryItem = z.infer<typeof masonryGalleryItemSchema>;
