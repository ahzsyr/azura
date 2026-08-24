import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import type {
  SeoIntegrationProviderId,
  SeoSubmissionKind,
  SeoSubmissionReason,
} from "@/features/seo/types";
import { SEO_INTEGRATION_PROVIDERS } from "./providers";
import { shouldEnqueueProviderJob } from "./enqueue-policy";
import { normalizeWiredCmsAbsoluteUrl } from "@/features/cms/cms-page-path";
import { alignUrlToPreferredOrigin } from "@/lib/preferred-host";

export { shouldEnqueueProviderJob } from "./enqueue-policy";

async function resolveEnqueueOrigin(origin?: string) {
  return (origin ?? (await resolveSiteOrigin("background"))).replace(/\/$/, "");
}

async function absoluteUrl(pathOrUrl: string, origin?: string) {
  const siteOrigin = await resolveEnqueueOrigin(origin);
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return alignUrlToPreferredOrigin(normalizeWiredCmsAbsoluteUrl(pathOrUrl), siteOrigin);
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return alignUrlToPreferredOrigin(
    normalizeWiredCmsAbsoluteUrl(`${siteOrigin}${path}`),
    siteOrigin,
  );
}

export async function enqueueSeoSubmissionsForPath(params: {
  kind: SeoSubmissionKind;
  reason: SeoSubmissionReason;
  paths: string[];
  providers?: SeoIntegrationProviderId[];
  siteOrigin?: string;
}): Promise<number> {
  const siteUrl = await resolveEnqueueOrigin(params.siteOrigin);
  const config = await seoRepository.getIntegrationsConfig();
  const urls = [
    ...new Set(
      (await Promise.all(params.paths.map((path) => absoluteUrl(path, params.siteOrigin))))
        .map((u) => u.trim())
        .filter(Boolean),
    ),
  ];
  if (urls.length === 0) return 0;

  const jobs = SEO_INTEGRATION_PROVIDERS.flatMap((provider) => {
    if (params.providers && !params.providers.includes(provider.id)) return [];
    if (!shouldEnqueueProviderJob(provider.id, params.kind)) return [];
    const providerConfig = config[provider.id];
    if (!provider.isConfigured(providerConfig)) return [];
    return urls.map((url) => ({
      provider: provider.id,
      kind: params.kind,
      reason: params.reason,
      url,
      metadata: { siteUrl },
    }));
  });

  if (jobs.length) await seoRepository.enqueueSubmissionJobs(jobs);
  return jobs.length;
}

export async function enqueueSitemapSubmission(
  reason: SeoSubmissionReason,
  siteOrigin?: string,
): Promise<number> {
  return enqueueSeoSubmissionsForPath({
    kind: "SITEMAP",
    reason,
    paths: ["/sitemap.xml"],
    siteOrigin,
  });
}

export async function getDefaultSitemapUrl(siteOrigin?: string) {
  return absoluteUrl("/sitemap.xml", siteOrigin);
}

export async function getServerDefaultSitemapUrl(): Promise<string> {
  return getDefaultSitemapUrl(await resolveSiteOrigin("background"));
}

export async function toAbsoluteSeoUrl(pathOrUrl: string, siteOrigin?: string) {
  return absoluteUrl(pathOrUrl, siteOrigin);
}
