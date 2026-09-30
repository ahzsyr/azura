/** Normalize catalog product publish status from DB or index metadata. */
export function normalizeProductPublishStatus(status: string | null | undefined): string {
  const normalized = (status ?? "published").trim().toLowerCase();
  return normalized || "published";
}

/** Whether a product should appear in public search, listings, sitemap, and product pages. */
export function isProductPublishedForSearch(status: string | null | undefined): boolean {
  return normalizeProductPublishStatus(status) === "published";
}

export type ProductVisibilityOptions = {
  /** Admin/catalog tools may load drafts. Public storefront must not. */
  includeUnpublished?: boolean;
};

/** Whether a product should be returned to the current request (PDP, SEO, APIs). */
export function isProductVisibleOnStorefront(
  status: string | null | undefined,
  options?: ProductVisibilityOptions,
): boolean {
  if (options?.includeUnpublished) return true;
  return isProductPublishedForSearch(status);
}

export function publishStatusFromProductPayload(product: unknown): string | undefined {
  if (!product || typeof product !== "object") return undefined;
  const status = (product as Record<string, unknown>).status;
  return typeof status === "string" ? status : undefined;
}
