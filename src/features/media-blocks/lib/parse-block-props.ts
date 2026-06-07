import {
  interactiveHotspotsPropsSchema,
  masonryGalleryPropsSchema,
  videoGalleryPropsSchema,
  videoHeroPropsSchema,
} from "@/features/media-blocks/schemas/media-blocks";

export function parseVideoHeroProps(raw: Record<string, unknown>) {
  return videoHeroPropsSchema.parse(raw);
}

export function parseVideoGalleryProps(raw: Record<string, unknown>) {
  return videoGalleryPropsSchema.parse(raw);
}

export function parseInteractiveHotspotsProps(raw: Record<string, unknown>) {
  return interactiveHotspotsPropsSchema.parse(raw);
}

export function parseMasonryGalleryProps(raw: Record<string, unknown>) {
  return masonryGalleryPropsSchema.parse(raw);
}
