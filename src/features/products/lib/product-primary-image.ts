import type { Product, ProductMediaImage } from "@/features/products/types";

function urlFromMediaEntry(entry: unknown): string | undefined {
  if (!entry || typeof entry !== "object") return undefined;
  const url = (entry as { url?: unknown }).url;
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
}

function firstUrlFromEntries(entries: unknown[] | undefined): string | undefined {
  if (!entries?.length) return undefined;
  for (const entry of entries) {
    const url = urlFromMediaEntry(entry);
    if (url) return url;
  }
  return undefined;
}

/** Resolve the best primary image URL from product media (images, then thumbnails). */
export function resolveProductPrimaryImageUrl(product: Pick<Product, "media">): string | undefined {
  const images = product.media?.images ?? [];
  const fromMain = images.find((img: ProductMediaImage) => img.type === "main")?.url;
  const fromFirst = images[0]?.url;
  const fromThumbnail = firstUrlFromEntries(product.media?.thumbnails);
  return fromMain || fromFirst || fromThumbnail;
}

/** Resolve a secondary/gallery image distinct from the primary when possible. */
export function resolveProductSecondaryImageUrl(product: Pick<Product, "media">): string | undefined {
  const images = product.media?.images ?? [];
  return images.find((img) => img.url && img.type !== "main")?.url;
}
