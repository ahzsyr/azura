import type { ProductListingRecord } from "@/features/products/listing/types";

function normalizeComparableUrl(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const trimmed = src.trim();
  return trimmed || undefined;
}

/** Gallery order: primary, gallery slots, secondary — second unique URL is the flip-back image. */
export function resolveFlipBackImageSrc(product: ProductListingRecord): string | undefined {
  const galleryImages = [
    normalizeComparableUrl(product.primary_image),
    ...(product.gallery_images ?? []).map(normalizeComparableUrl),
    normalizeComparableUrl(product.secondary_image),
  ].filter((src, index, arr): src is string => Boolean(src) && arr.indexOf(src) === index);

  return galleryImages[1] ?? galleryImages[0];
}
