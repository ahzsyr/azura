/**
 * HTTP cache policy for /uploads.
 * Chrome cannot store some 206 Partial Content / QuickTime responses
 * (net::ERR_CACHE_OPERATION_NOT_SUPPORTED).
 */
export function uploadCacheControl(contentType: string, isPartial: boolean): string {
  if (isPartial) return "private, no-store";
  if (contentType === "video/quicktime") return "private, no-store";
  return "public, max-age=86400";
}
