import "server-only";
import type {
  SeoIntegrationProviderId,
  SeoSubmissionKind,
  SeoSubmissionReason,
} from "@/features/seo/types";
import { SEO_INTEGRATION_PROVIDERS } from "./providers";
import { seoRepository } from "@/repositories/seo.repository";
import { enqueueSeoSubmissionsForPath } from "./enqueue";

export const seoIntegrationRegistry = {
  providers: SEO_INTEGRATION_PROVIDERS,

  async health() {
    const config = await seoRepository.getIntegrationsConfig();
    return Promise.all(
      SEO_INTEGRATION_PROVIDERS.map((provider) => provider.health(config[provider.id]))
    );
  },

  async enqueue(params: {
    kind: SeoSubmissionKind;
    reason: SeoSubmissionReason;
    urls: string[];
    providers?: SeoIntegrationProviderId[];
  }) {
    await enqueueSeoSubmissionsForPath({
      kind: params.kind,
      reason: params.reason,
      paths: params.urls,
      providers: params.providers,
    });
  },
};
