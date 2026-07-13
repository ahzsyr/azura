import type { SeoIntegrationProviderConfig, SeoIntegrationsConfig } from "@/features/seo/types";

const SECRET_KEYS = ["apiKey", "bearerToken", "refreshToken", "clientSecret", "serviceAccountJson"] as const;

export function mergeSecretFields(
  next: SeoIntegrationsConfig,
  existing: SeoIntegrationsConfig,
  sealedExisting: SeoIntegrationsConfig = {}
): SeoIntegrationsConfig {
  const mergeProvider = (
    incoming?: SeoIntegrationProviderConfig,
    current?: SeoIntegrationProviderConfig,
    sealedCurrent?: SeoIntegrationProviderConfig
  ) => {
    const definedIncoming = incoming
      ? (Object.fromEntries(
          Object.entries(incoming).filter(([, value]) => value !== undefined),
        ) as SeoIntegrationProviderConfig)
      : {};
    const merged: SeoIntegrationProviderConfig = { ...(current ?? {}), ...definedIncoming };
    for (const key of SECRET_KEYS) {
      if (incoming?.[key]?.trim()) continue;
      if (current?.[key]) {
        merged[key] = current[key];
      } else if (sealedCurrent?.[key]) {
        merged[key] = sealedCurrent[key];
      }
    }
    return merged;
  };
  return {
    google: mergeProvider(next.google, existing.google, sealedExisting.google),
    bing: mergeProvider(next.bing, existing.bing, sealedExisting.bing),
    indexnow: mergeProvider(next.indexnow, existing.indexnow, sealedExisting.indexnow),
  };
}
