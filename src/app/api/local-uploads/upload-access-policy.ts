/**
 * Authorization + response-policy decisions for GET/HEAD /uploads/*.
 *
 * Kept free of Prisma/`server-only` so the security contract is unit-testable.
 * The route wires these to `auth()` and `prisma.mediaAsset`.
 */

export type UploadVisibility = "PUBLIC" | "GATED" | "PRIVATE";

export type UploadAssetLookup = {
  visibility: UploadVisibility;
  mediaType?: string | null;
  mimeType?: string | null;
};

/** Successful lookup of the MediaAsset row backing an upload URL. */
export type UploadAssetLookupResult = { ok: true; asset: UploadAssetLookup };

/**
 * Fail-closed policy: only a row explicitly marked PUBLIC is served
 * anonymously. PRIVATE (default for form uploads) and GATED require an admin
 * session. The caller passes `null` when lookup failed or found no row, which
 * denies (the route then returns 404 rather than revealing whether the bytes
 * exist).
 *
 * Note: extension / mediaType / mimeType are deliberately NOT consulted.
 * `image/*` and `.svg` are not evidence of public visibility.
 */
export function isUploadVisibleTo(
  asset: UploadAssetLookup | null | undefined,
  isAdmin: boolean,
): boolean {
  if (!asset) return false;
  return asset.visibility === "PUBLIC" || isAdmin;
}

/** Cache-Control for an upload response. */
export function uploadResponseCacheControl(
  asset: UploadAssetLookup | null | undefined,
  contentType: string,
  isPartial: boolean,
): string {
  if (isPartial) return "private, no-store";
  if (asset?.visibility !== "PUBLIC") return "private, no-store";
  if (contentType === "video/quicktime") return "private, no-store";
  return "public, max-age=86400";
}
