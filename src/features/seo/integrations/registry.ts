import "server-only";
import type {
  SeoIntegrationProviderId,
  SeoSubmissionKind,
  SeoSubmissionReason,
} from "@/features/seo/types";
import type { SeoIntegrationHealthOptions } from "./types";
import { SEO_INTEGRATION_PROVIDERS } from "./providers";
import { seoRepository } from "@/repositories/seo.repository";
import { enqueueSeoSubmissionsForPath } from "./enqueue";
import type { SeoIntegrationsConfig } from "@/features/seo/types";

function mergeIndexingConfig(config: SeoIntegrationsConfig): SeoIntegrationsConfig {
  const legacyJson = config.google?.serviceAccountJson?.trim();
  const dedicated = config.google_indexing?.serviceAccountJson?.trim();
  if (!dedicated && legacyJson) {
    return {
      ...config,
      google_indexing: {
        ...config.google_indexing,
        enabled: config.google_indexing?.enabled ?? true,
        serviceAccountJson: legacyJson,
      },
    };
  }
  return config;
}

export const seoIntegrationRegistry = {
  providers: SEO_INTEGRATION_PROVIDERS,

  async health(options?: SeoIntegrationHealthOptions) {
    const config = mergeIndexingConfig(await seoRepository.getIntegrationsConfig());
    return Promise.all(
      SEO_INTEGRATION_PROVIDERS.map((provider) =>
        provider.health(config[provider.id], options),
      ),
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
