import { Suspense } from "react";
import { seoRepository } from "@/repositories/seo.repository";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import { GoogleAdminClient } from "@/features/seo/admin/google-admin-client";
import { getServerDefaultSitemapUrl } from "@/features/seo/integrations/enqueue";
import { getServerAppOrigin } from "@/lib/oauth-redirect-origin";
import type { PublicSeoIntegrationsConfig, SeoProviderHealth, SeoTrackingConfig } from "@/features/seo/types";
import { loadGooglePlatformAdminData, loadGoogleIntegrationPageData } from "@/features/seo/google-platform/server";
import { googleIntegrationRegistry } from "@/features/seo/google-platform/registry";
import type { GoogleIntegrationId } from "@/features/seo/google-platform/types";

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
    health = await seoIntegrationRegistry.health({ liveGoogle: true });
  } catch {
    // DB unavailable
  }

  const platformData = await loadGooglePlatformAdminData({ public: true });
  const integrationPages: Record<string, Awaited<ReturnType<typeof loadGoogleIntegrationPageData>>> = {};
  for (const def of googleIntegrationRegistry.list()) {
    integrationPages[def.id] = await loadGoogleIntegrationPageData(def.id as GoogleIntegrationId);
  }

  const google = integrationsConfig.google ?? {};
  const resolvedSearchParams = (await searchParams) ?? {};
  const siteUrl = (await getServerAppOrigin()).replace(/\/$/, "");
  const sitemapUrl = await getServerDefaultSitemapUrl();
  const envClientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim();
  const envClientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim();
  const canStartGoogleOAuth = Boolean(
    (google.clientId?.trim() ||
      platformData.platform.global.oauthClientId?.trim() ||
      envClientId) &&
      (google.hasClientSecret ||
        platformData.platform.global.oauthClientSecret ||
        envClientSecret),
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
        summary={platformData.summary}
        cards={platformData.cards}
        globalSettings={platformData.platform.global}
        integrationPages={Object.fromEntries(
          Object.entries(integrationPages).map(([id, page]) => [
            id,
            {
              definition: page.serializableDefinition,
              sections: page.sections,
              connection: page.connection,
              configuration: page.configuration,
              policy: page.policy,
              monitoring: page.monitoring,
              history: page.history,
              dependencyMessage: page.dependencyMessage,
            },
          ]),
        )}
      />
    </Suspense>
  );
}
