import type {
  PublicSeoIntegrationsConfig,
  SeoIntegrationProviderConfig,
  SeoIntegrationsConfig,
} from "@/features/seo/types";
import { sealSecret, unsealSecret } from "./secret-seal.server";

const SECRET_KEYS = ["apiKey", "bearerToken", "refreshToken", "clientSecret", "serviceAccountJson"] as const;

function sealProviderConfig(
  config: SeoIntegrationProviderConfig | undefined
): SeoIntegrationProviderConfig | undefined {
  if (!config) return undefined;
  return {
    ...config,
    apiKey: sealSecret(config.apiKey),
    bearerToken: sealSecret(config.bearerToken),
    refreshToken: sealSecret(config.refreshToken),
    clientSecret: sealSecret(config.clientSecret),
    serviceAccountJson: sealSecret(config.serviceAccountJson),
  };
}

function unsealProviderConfig(
  config: SeoIntegrationProviderConfig | undefined
): SeoIntegrationProviderConfig | undefined {
  if (!config) return undefined;
  return {
    ...config,
    apiKey: unsealSecret(config.apiKey),
    bearerToken: unsealSecret(config.bearerToken),
    refreshToken: unsealSecret(config.refreshToken),
    clientSecret: unsealSecret(config.clientSecret),
    serviceAccountJson: unsealSecret(config.serviceAccountJson),
  };
}

export function sealIntegrationsConfig(config: SeoIntegrationsConfig): SeoIntegrationsConfig {
  return {
    google: sealProviderConfig(config.google),
    bing: sealProviderConfig(config.bing),
    indexnow: sealProviderConfig(config.indexnow),
  };
}

export function unsealIntegrationsConfig(config: SeoIntegrationsConfig): SeoIntegrationsConfig {
  return {
    google: unsealProviderConfig(config.google),
    bing: unsealProviderConfig(config.bing),
    indexnow: unsealProviderConfig(config.indexnow),
  };
}

export function redactIntegrationsConfig(config: SeoIntegrationsConfig): PublicSeoIntegrationsConfig {
  const redact = (provider?: SeoIntegrationProviderConfig) => {
    if (!provider) return undefined;
    const { apiKey, bearerToken, refreshToken, clientSecret, serviceAccountJson, ...safe } = provider;
    return {
      ...safe,
      hasApiKey: Boolean(apiKey?.trim()),
      hasBearerToken: Boolean(bearerToken?.trim()),
      hasRefreshToken: Boolean(refreshToken?.trim()),
      hasClientSecret: Boolean(clientSecret?.trim()),
      hasServiceAccountJson: Boolean(serviceAccountJson?.trim()),
    };
  };
  return {
    google: redact(config.google),
    bing: redact(config.bing),
    indexnow: redact(config.indexnow),
  };
}

export function mergeSecretFields(
  next: SeoIntegrationsConfig,
  existing: SeoIntegrationsConfig
): SeoIntegrationsConfig {
  const mergeProvider = (
    incoming?: SeoIntegrationProviderConfig,
    current?: SeoIntegrationProviderConfig
  ) => {
    const merged: SeoIntegrationProviderConfig = { ...(current ?? {}), ...(incoming ?? {}) };
    for (const key of SECRET_KEYS) {
      if (!incoming?.[key]?.trim() && current?.[key]) {
        merged[key] = current[key];
      }
    }
    return merged;
  };
  return {
    google: mergeProvider(next.google, existing.google),
    bing: mergeProvider(next.bing, existing.bing),
    indexnow: mergeProvider(next.indexnow, existing.indexnow),
  };
}
