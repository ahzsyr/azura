"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import type {
  PublicSeoIntegrationsConfig,
  SeoProviderHealth,
  SeoTrackingConfig,
} from "@/features/seo/types";
import { GoogleTagsSettingsClient } from "./google-tags-settings-client";
import { GoogleSearchConsolePanel } from "./google-search-console-panel";
import {
  SEO_GOOGLE_TABS,
  isValidGoogleTab,
  type SeoGoogleTabId,
} from "./seo-google-tabs";
import { GooglePlatformOverview } from "@/features/seo/google-platform/ui/overview";
import { GoogleGlobalSettingsPage } from "@/features/seo/google-platform/ui/settings-page";
import { GoogleIntegrationPage } from "@/features/seo/google-platform/ui/integration-page";
import type { GoogleWorkspaceSummary, GoogleOperationalCard } from "@/features/seo/google-platform/monitoring";
import type {
  GoogleConnectionSnapshot,
  GoogleGlobalSettings,
  GoogleHistoryEntry,
  GoogleIntegrationDefinition,
  GoogleMonitoringSnapshot,
  GoogleOperationalPolicy,
  GoogleServiceConfigMap,
} from "@/features/seo/google-platform/types";

export type SerializableGoogleDefinition = Pick<
  GoogleIntegrationDefinition,
  | "id"
  | "displayName"
  | "icon"
  | "category"
  | "description"
  | "requiredScopes"
  | "capabilities"
  | "operations"
  | "configurationSchema"
  | "defaultPolicy"
  | "dependencies"
  | "contractVersion"
  | "schemaVersion"
  | "migrationVersion"
  | "connectorId"
  | "tabId"
>;

export type GoogleIntegrationPageData = {
  definition: SerializableGoogleDefinition;
  sections: string[];
  connection: GoogleConnectionSnapshot;
  configuration: GoogleServiceConfigMap;
  policy: GoogleOperationalPolicy;
  monitoring: GoogleMonitoringSnapshot;
  history: GoogleHistoryEntry[];
  dependencyMessage?: string;
};

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
  summary: GoogleWorkspaceSummary;
  cards: GoogleOperationalCard[];
  globalSettings: GoogleGlobalSettings;
  integrationPages: Record<string, GoogleIntegrationPageData>;
};

type TabStatus = NonNullable<import("@/components/admin/layout/admin-settings-layout").SettingsRibbonTab["status"]>;

function cardStatus(card?: GoogleOperationalCard): TabStatus | undefined {
  if (!card) return undefined;
  if (!card.connected) return "setup";
  if (card.errors > 0) return "error";
  if (card.warnings > 0) return "warning";
  return "connected";
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
  summary,
  cards,
  globalSettings,
  integrationPages,
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

  const ribbonTabs = SEO_GOOGLE_TABS.map((tab) => {
    if (tab.id === "overview" || tab.id === "settings") return tab;
    const card = cards.find((c) => c.tabId === tab.id);
    return { id: tab.id, label: tab.label, status: cardStatus(card) };
  });

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <Link href="/admin/seo/metadata" className="text-sm text-primary hover:underline">
          ← SEO Dashboard
        </Link>
        <AdminPageHeader
          className="mb-0 mt-2"
          title="Google"
          description="Metadata-driven Google Integration Platform — connection, configuration, operations, monitoring, and automation in one place."
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
        layout="sidebar"
      >
        {(tab) => {
          if (tab === "overview") {
            return (
              <GooglePlatformOverview
                summary={summary}
                cards={cards}
                onNavigateTab={handleTabChange}
              />
            );
          }

          if (tab === "settings") {
            return <GoogleGlobalSettingsPage settings={globalSettings} />;
          }

          // Keep legacy deep forms for Analytics / GTM / Search Console while platform pages roll out
          if (tab === "analytics") {
            return (
              <div className="space-y-6">
                {integrationPages.analytics ? (
                  <GoogleIntegrationPage
                    definition={integrationPages.analytics.definition}
                    sections={integrationPages.analytics.sections}
                    connection={integrationPages.analytics.connection}
                    configuration={integrationPages.analytics.configuration}
                    policy={integrationPages.analytics.policy}
                    monitoring={integrationPages.analytics.monitoring}
                    history={integrationPages.analytics.history}
                    dependencyMessage={integrationPages.analytics.dependencyMessage}
                    canStartOAuth={canStartGoogleOAuth}
                  />
                ) : null}
                <GoogleTagsSettingsClient
                  config={trackingConfig}
                  envFallbackGaId={envFallbackGaId}
                  siteUrl={siteUrl}
                  focus="gtag"
                  embedded
                />
              </div>
            );
          }

          if (tab === "tag-manager") {
            return (
              <div className="space-y-6">
                {integrationPages.tag_manager ? (
                  <GoogleIntegrationPage
                    definition={integrationPages.tag_manager.definition}
                    sections={integrationPages.tag_manager.sections}
                    connection={integrationPages.tag_manager.connection}
                    configuration={integrationPages.tag_manager.configuration}
                    policy={integrationPages.tag_manager.policy}
                    monitoring={integrationPages.tag_manager.monitoring}
                    history={integrationPages.tag_manager.history}
                    dependencyMessage={integrationPages.tag_manager.dependencyMessage}
                  />
                ) : null}
                <GoogleTagsSettingsClient
                  config={trackingConfig}
                  envFallbackGaId={envFallbackGaId}
                  siteUrl={siteUrl}
                  focus="gtm"
                  embedded
                />
              </div>
            );
          }

          if (tab === "search-console") {
            return (
              <div className="space-y-6">
                {integrationPages.search_console ? (
                  <GoogleIntegrationPage
                    definition={integrationPages.search_console.definition}
                    sections={integrationPages.search_console.sections}
                    connection={integrationPages.search_console.connection}
                    configuration={integrationPages.search_console.configuration}
                    policy={integrationPages.search_console.policy}
                    monitoring={integrationPages.search_console.monitoring}
                    history={integrationPages.search_console.history}
                    dependencyMessage={integrationPages.search_console.dependencyMessage}
                    canStartOAuth={canStartGoogleOAuth}
                  />
                ) : null}
                <GoogleSearchConsolePanel
                  google={google}
                  health={health}
                  canStartGoogleOAuth={canStartGoogleOAuth}
                  siteUrl={siteUrl}
                  sitemapUrl={sitemapUrl}
                  embedded
                />
              </div>
            );
          }

          const page = Object.values(integrationPages).find((p) => p.definition.tabId === tab);
          if (!page) {
            return <p className="text-sm text-muted-foreground">Integration not found.</p>;
          }

          return (
            <GoogleIntegrationPage
              definition={page.definition}
              sections={page.sections}
              connection={page.connection}
              configuration={page.configuration}
              policy={page.policy}
              monitoring={page.monitoring}
              history={page.history}
              dependencyMessage={page.dependencyMessage}
              canStartOAuth={canStartGoogleOAuth}
            />
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}
