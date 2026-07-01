import { safeParseProps } from "@/lib/zod/safe-parse-props";
import {
  interactiveHotspotsPropsSchema,
  masonryGalleryPropsSchema,
  videoGalleryPropsSchema,
  videoHeroPropsSchema,
} from "@/features/builder/blocks/media/schemas/media-blocks";

const DEFAULT_VIDEO_HERO = videoHeroPropsSchema.parse({});
const DEFAULT_VIDEO_GALLERY = videoGalleryPropsSchema.parse({});
const DEFAULT_INTERACTIVE_HOTSPOTS = interactiveHotspotsPropsSchema.parse({});
const DEFAULT_MASONRY_GALLERY = masonryGalleryPropsSchema.parse({});

export function parseVideoHeroProps(raw: Record<string, unknown>) {
  return safeParseProps(videoHeroPropsSchema, raw, DEFAULT_VIDEO_HERO, "parseVideoHeroProps");
}

export function parseVideoGalleryProps(raw: Record<string, unknown>) {
  return safeParseProps(
    videoGalleryPropsSchema,
    raw,
    DEFAULT_VIDEO_GALLERY,
    "parseVideoGalleryProps",
  );
}

export function parseInteractiveHotspotsProps(raw: Record<string, unknown>) {
  return safeParseProps(
    interactiveHotspotsPropsSchema,
    raw,
    DEFAULT_INTERACTIVE_HOTSPOTS,
    "parseInteractiveHotspotsProps",
  );
}

export function parseMasonryGalleryProps(raw: Record<string, unknown>) {
  return safeParseProps(
    masonryGalleryPropsSchema,
    raw,
    DEFAULT_MASONRY_GALLERY,
    "parseMasonryGalleryProps",
  );
}
