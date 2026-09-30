import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoIntegrationProviderConfig } from "@/features/seo/types";

function isExpired(config: SeoIntegrationProviderConfig) {
  if (!config.tokenExpiresAt) return false;
  return new Date(config.tokenExpiresAt).getTime() < Date.now() + 60_000;
}

export async function refreshGoogleToken(config: SeoIntegrationProviderConfig) {
  if (!config.refreshToken || !config.clientId || !config.clientSecret) return config.bearerToken;
  if (config.bearerToken && !isExpired(config)) return config.bearerToken;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Google token refresh failed: ${await response.text()}`);
  const body = (await response.json()) as { access_token: string; expires_in?: number };
  const existing = await seoRepository.getIntegrationsConfig();
  await seoRepository.upsertIntegrationsConfig({
    ...existing,
    google: {
      ...existing.google,
      bearerToken: body.access_token,
      tokenExpiresAt: new Date(Date.now() + (body.expires_in ?? 3600) * 1000).toISOString(),
    },
  });
  return body.access_token;
}
