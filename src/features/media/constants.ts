import type { MediaType } from "@prisma/client";

/**
 * Default image when no media is set.
 * Source file: src/data/placeholder.svg (synced to public/images via npm run sync:placeholder).
 */
export const PLACEHOLDER_IMAGE_PATH = "/images/placeholder.svg";

/** @deprecated Use PLACEHOLDER_IMAGE_PATH */
export const DEFAULT_MEDIA_PLACEHOLDER = PLACEHOLDER_IMAGE_PATH;

export function hasMediaUrl(url?: string | null): boolean {
  const trimmed = url?.trim();
  return Boolean(trimmed && (trimmed.startsWith("http") || trimmed.startsWith("/")));
}

/** Returns the URL when set, otherwise the placeholder (does not mutate stored values). */
export function resolveMediaUrl(
  url?: string | null,
  fallback: string = DEFAULT_MEDIA_PLACEHOLDER
): string {
  return hasMediaUrl(url) ? url!.trim() : fallback;
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  IMAGE: "Images",
  VIDEO: "Videos",
  DOCUMENT: "Documents",
  SVG: "SVG",
};

/** Stable default for image pickers — avoids inline array churn in picker load effects */
export const IMAGE_PICKER_MEDIA_TYPES: MediaType[] = ["IMAGE", "SVG"];

/** All CMS media types shown when no filter is passed to the picker panel */
export const ALL_PICKER_MEDIA_TYPES: MediaType[] = ["IMAGE", "VIDEO", "DOCUMENT", "SVG"];

export const MEDIA_UPLOAD_ENDPOINTS: Record<
  MediaType,
  "imageUploader" | "videoUploader" | "documentUploader" | "svgUploader"
> = {
  IMAGE: "imageUploader",
  VIDEO: "videoUploader",
  DOCUMENT: "documentUploader",
  SVG: "svgUploader",
};

export const MEDIA_USAGE_ENTITY_LABELS: Record<string, string> = {
  POST: "Blog post",
  CMS_PAGE: "CMS page",
  PACKAGE: "Package",
  GALLERY: "Gallery",
  TESTIMONIAL: "Testimonial",
  HOTEL: "Hotel",
  THEME: "Theme",
  HEADER: "Header builder",
  BLOCK: "Page block",
};

export function usageAdminHref(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "POST":
      return `/admin/posts/${entityId}`;
    case "CMS_PAGE":
      return `/admin/pages/${entityId}`;
    case "PACKAGE":
      return `/admin/packages/${entityId}`;
    case "GALLERY":
      return "/admin/gallery";
    case "TESTIMONIAL":
      return "/admin/testimonials";
    case "HOTEL":
      return "/admin/hotels";
    case "THEME":
      return "/admin/theme";
    case "HEADER":
      return "/admin/header";
    default:
      return null;
  }
}
