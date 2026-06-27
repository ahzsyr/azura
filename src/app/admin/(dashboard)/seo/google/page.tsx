import { Suspense } from "react";
import { redirect } from "next/navigation";
import { seoRepository } from "@/repositories/seo.repository";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import { GoogleAdminClient } from "@/features/seo/admin/google-admin-client";
import { getServerDefaultSitemapUrl } from "@/features/seo/integrations/enqueue";
import { getServerAppOrigin } from "@/lib/oauth-redirect-origin";
import type { PublicSeoIntegrationsConfig, SeoProviderHealth, SeoTrackingConfig } from "@/features/seo/types";

export const dynamic = "force-dynamic";

export default async function AdminGooglePage({
  searchParams,
}: {
  searchParams?: Promise<{
    googleOAuth?: string;
    tab?: string;
    message?: string;
    googleSaved?: string;
  }>;
}) {
  let trackingConfig: SeoTrackingConfig = {};
  let integrationsConfig: PublicSeoIntegrationsConfig = {};
  let health: SeoProviderHealth[] = [];

  try {
    trackingConfig = await seoRepository.getTrackingConfig();
  } catch {
    // DB unavailable
  }

  try {
    integrationsConfig = await seoRepository.getPublicIntegrationsConfig();
  } catch {
    // DB unavailable
  }

  try {
    health = await seoIntegrationRegistry.health();
  } catch {
    // DB unavailable
  }

  const google = integrationsConfig.google ?? {};
  const resolvedSearchParams = (await searchParams) ?? {};
  const siteUrl = (await getServerAppOrigin()).replace(/\/$/, "");
  const sitemapUrl = await getServerDefaultSitemapUrl();
  const envClientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim();
  const envClientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim();
  const canStartGoogleOAuth = Boolean(
    (google.clientId?.trim() || envClientId) && (google.hasClientSecret || envClientSecret),
  );
  const envFallbackGaId = process.env.NEXT_PUBLIC_GA_ID?.trim() || undefined;

  return (
    <Suspense fallback={null}>
      <GoogleAdminClient
        trackingConfig={trackingConfig}
        integrationsConfig={integrationsConfig}
        health={health}
        siteUrl={siteUrl}
        sitemapUrl={sitemapUrl}
        canStartGoogleOAuth={canStartGoogleOAuth}
        envFallbackGaId={envFallbackGaId}
        googleOAuthStatus={resolvedSearchParams.googleOAuth}
        googleOAuthMessage={resolvedSearchParams.message}
      />
    </Suspense>
  );
}
