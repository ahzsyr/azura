import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import type {
  SeoIntegrationProviderId,
  SeoSubmissionKind,
  SeoSubmissionReason,
} from "@/features/seo/types";
import { SEO_INTEGRATION_PROVIDERS } from "./providers";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

export async function enqueueSeoSubmissionsForPath(params: {
  kind: SeoSubmissionKind;
  reason: SeoSubmissionReason;
  paths: string[];
  providers?: SeoIntegrationProviderId[];
}) {
  const config = await seoRepository.getIntegrationsConfig();
  const urls = [
    ...new Set(params.paths.map((path) => absoluteUrl(path).trim()).filter(Boolean)),
  ];
  if (urls.length === 0) return;

  const jobs = SEO_INTEGRATION_PROVIDERS.flatMap((provider) => {
    if (params.providers && !params.providers.includes(provider.id)) return [];
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
}

export async function enqueueSitemapSubmission(reason: SeoSubmissionReason) {
  await enqueueSeoSubmissionsForPath({
    kind: "SITEMAP",
    reason,
    paths: ["/sitemap.xml"],
  });
}

export function toAbsoluteSeoUrl(pathOrUrl: string) {
  return absoluteUrl(pathOrUrl);
}
