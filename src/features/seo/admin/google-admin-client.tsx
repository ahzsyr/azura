"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import type {
  PublicSeoIntegrationProviderConfig,
  PublicSeoIntegrationsConfig,
  SeoProviderHealth,
  SeoTrackingConfig,
} from "@/features/seo/types";
import { GoogleTagsSettingsClient } from "./google-tags-settings-client";
import { GoogleSearchConsolePanel } from "./google-search-console-panel";
import { GoogleServicesOverview } from "./google-services-overview";
import {
  isGa4AnalyticsReady,
  isGscSitemapReady,
} from "./google-integration-readiness";
import {
  isGtagSiteTrackingConfigured,
  isGtmSiteTrackingConfigured,
  isTrackingConfigured,
} from "@/features/seo/tracking/resolve-tracking";
import {
  SEO_GOOGLE_TABS,
  isValidGoogleTab,
  type SeoGoogleTabId,
} from "./seo-google-tabs";

export type GoogleAdminClientProps = {
  trackingConfig: SeoTrackingConfig;
  integrationsConfig: PublicSeoIntegrationsConfig;
  health: SeoProviderHealth[];
  siteUrl: string;
  sitemapUrl: string;
  canStartGoogleOAuth: boolean;
  envFallbackGaId?: string;
  googleOAuthStatus?: string;
  googleOAuthMessage?: string;
};

function googleTabLabel(
  tabId: SeoGoogleTabId,
  trackingConfig: SeoTrackingConfig,
  google: PublicSeoIntegrationProviderConfig,
  health: SeoProviderHealth[],
  envFallbackGaId?: string,
): string {
  const base = SEO_GOOGLE_TABS.find((tab) => tab.id === tabId)?.label ?? tabId;
  const googleHealth = health.find((item) => item.provider === "google");

  if (tabId === "overview") return base;

  if (tabId === "analytics") {
    const active =
      isGtagSiteTrackingConfigured(trackingConfig) ||
      Boolean(envFallbackGaId && trackingConfig.enabled !== true && !isGtmSiteTrackingConfigured(trackingConfig));
    return active ? `${base} · active` : `${base} · setup`;
  }

  if (tabId === "tag-manager") {
    const active = isGtmSiteTrackingConfigured(trackingConfig);
    return active ? `${base} · active` : `${base} · setup`;
  }

  if (tabId === "search-console") {
    if (!google.enabled) return `${base} · off`;
    if (!isGscSitemapReady(google)) return `${base} · setup`;
    if (googleHealth && !googleHealth.ok) return `${base} · setup`;
    if (!google.analyticsEnabled || isGa4AnalyticsReady(google)) {
      return `${base} · connected`;
    }
    return `${base} · setup`;
  }

  return base;
}

export function GoogleAdminClient({
  trackingConfig,
  integrationsConfig,
  health,
  siteUrl,
  sitemapUrl,
  canStartGoogleOAuth,
  envFallbackGaId,
  googleOAuthStatus,
  googleOAuthMessage,
}: GoogleAdminClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const google = integrationsConfig.google ?? {};

  const activeTab = useMemo((): SeoGoogleTabId => {
    if (googleOAuthStatus === "missing_client_id") return "search-console";
    if (googleOAuthStatus === "success" || googleOAuthStatus === "error") return "search-console";
    return isValidGoogleTab(tabParam) ? tabParam : "overview";
  }, [tabParam, googleOAuthStatus]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    if (tabId !== "search-console") {
      params.delete("googleOAuth");
      params.delete("message");
      params.delete("googleSaved");
    }
    router.replace(`/admin/seo/google?${params.toString()}`, { scroll: false });
  };

  const ribbonTabs = SEO_GOOGLE_TABS.map((tab) => ({
    id: tab.id,
    label: googleTabLabel(tab.id, trackingConfig, google, health, envFallbackGaId),
  }));

  const savedSiteTracking = isTrackingConfigured(trackingConfig);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/admin/seo/metadata" className="text-sm text-primary hover:underline">
          ← SEO Dashboard
        </Link>
        <AdminPageHeader
          className="mb-0 mt-2"
          title="Google"
          description="Google Analytics, Tag Manager, Search Console, and analytics API configuration in one place."
        />
        {googleOAuthStatus === "success" ? (
          <p
            className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100"
            role="status"
          >
            Google connected — tokens saved.
          </p>
        ) : null}
        {googleOAuthStatus === "error" ? (
          <p
            className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {googleOAuthMessage || "Google OAuth failed. Try connecting again."}
          </p>
        ) : null}
      </div>

      <AdminSettingsLayout
        tabs={ribbonTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layoutId="seo-google-ribbon"
      >
        {(tab) => {
          if (tab === "overview") {
            return (
              <GoogleServicesOverview
                trackingConfig={trackingConfig}
                google={google}
                health={health}
                envFallbackGaId={envFallbackGaId}
                onNavigateTab={handleTabChange}
              />
            );
          }

          if (tab === "analytics") {
            return (
              <GoogleTagsSettingsClient
                config={trackingConfig}
                envFallbackGaId={envFallbackGaId}
                siteUrl={siteUrl}
                focus="gtag"
                embedded
              />
            );
          }

          if (tab === "tag-manager") {
            return (
              <GoogleTagsSettingsClient
                config={trackingConfig}
                envFallbackGaId={envFallbackGaId}
                siteUrl={siteUrl}
                focus="gtm"
                embedded
              />
            );
          }

          return (
            <GoogleSearchConsolePanel
              google={google}
              health={health}
              canStartGoogleOAuth={canStartGoogleOAuth}
              siteUrl={siteUrl}
              sitemapUrl={sitemapUrl}
              embedded
            />
          );
        }}
      </AdminSettingsLayout>

      {!savedSiteTracking && activeTab !== "overview" ? (
        <p className="text-xs text-muted-foreground">
          Site tracking is not fully configured. Check the Overview tab for status across all Google
          services.
        </p>
      ) : null}
    </div>
  );
}
