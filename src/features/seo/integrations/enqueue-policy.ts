import type {
  SeoIntegrationProviderId,
  SeoSubmissionKind,
} from "@/features/seo/types";

/** GSC has no generic URL ping API — only sitemap submissions are queued for Google. */
export function shouldEnqueueProviderJob(
  providerId: SeoIntegrationProviderId,
  kind: SeoSubmissionKind,
): boolean {
  if (kind === "URL" && providerId === "google") return false;
  return true;
}
