import type {
  SeoIntegrationProviderId,
  SeoSubmissionKind,
} from "@/features/seo/types";

/** GSC has no generic URL ping API — only sitemap submissions are queued for Google.
 *  IndexNow accepts page URLs only — sitemap.xml submissions return "Invalid URL".
 *  Google Indexing API is for individual URLs, not sitemap.xml. */
export function shouldEnqueueProviderJob(
  providerId: SeoIntegrationProviderId,
  kind: SeoSubmissionKind,
): boolean {
  if (kind === "URL" && providerId === "google") return false;
  if (kind === "SITEMAP" && (providerId === "indexnow" || providerId === "google_indexing")) {
    return false;
  }
  return true;
}

export function skippedProviderJobMessage(
  providerId: SeoIntegrationProviderId,
  kind: SeoSubmissionKind,
): string | null {
  if (shouldEnqueueProviderJob(providerId, kind)) return null;
  if (kind === "URL" && providerId === "google") {
    return "Skipped: Google uses sitemap submission only";
  }
  if (kind === "SITEMAP" && providerId === "indexnow") {
    return "Skipped: IndexNow accepts page URLs only (use Bing/GSC for sitemap submission)";
  }
  if (kind === "SITEMAP" && providerId === "google_indexing") {
    return "Skipped: use Search Console sitemap submission for sitemaps";
  }
  return "Skipped: this provider does not accept this job kind";
}

export function sitemapEnqueueEmptyMessage(params: {
  indexNowConfigured: boolean;
  bingConfigured: boolean;
  googleConfigured: boolean;
}): string {
  if (params.indexNowConfigured && !params.bingConfigured && !params.googleConfigured) {
    return "IndexNow is configured, but it does not accept sitemap.xml. Configure Bing Webmaster or Google Search Console to submit the sitemap, or publish a page to notify IndexNow of individual URLs.";
  }
  return "No sitemap jobs were queued. Enable and configure Bing Webmaster or Google Search Console on the Configure tab.";
}
