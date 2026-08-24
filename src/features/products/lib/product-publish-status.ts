/** Normalize catalog product publish status from DB or index metadata. */
export function normalizeProductPublishStatus(status: string | null | undefined): string {
  const normalized = (status ?? "published").trim().toLowerCase();
  return normalized || "published";
}

/** Whether a product should appear in public search and listing indexes. */
export function isProductPublishedForSearch(status: string | null | undefined): boolean {
  return normalizeProductPublishStatus(status) === "published";
}
