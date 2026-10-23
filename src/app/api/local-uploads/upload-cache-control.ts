/**
 * HTTP cache policy for /uploads.
 * Chrome cannot store some 206 Partial Content / QuickTime responses
 * (net::ERR_CACHE_OPERATION_NOT_SUPPORTED).
 *
 * Superseded by `uploadResponseCacheControl` in upload-access-policy.ts, which
 * also makes PRIVATE/GATED uploads uncacheable. Kept as a thin delegate so the
 * QuickTime/range rules have a single implementation.
 */
import { uploadResponseCacheControl } from "@/app/api/local-uploads/upload-access-policy";

export function uploadCacheControl(contentType: string, isPartial: boolean): string {
  return uploadResponseCacheControl({ visibility: "PUBLIC" }, contentType, isPartial);
}
