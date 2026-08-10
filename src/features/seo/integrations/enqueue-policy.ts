import type {
  SeoIntegrationProviderId,
  SeoSubmissionKind,
} from "@/features/seo/types";

/** GSC has no generic URL ping API — only sitemap submissions are queued for Google.
 *  IndexNow accepts page URLs only — sitemap.xml submissions return "Invalid URL". */
export function shouldEnqueueProviderJob(
  providerId: SeoIntegrationProviderId,
  kind: SeoSubmissionKind,
): boolean {
  if (kind === "URL" && providerId === "google") return false;
  if (kind === "SITEMAP" && providerId === "indexnow") return false;
  return true;
}
