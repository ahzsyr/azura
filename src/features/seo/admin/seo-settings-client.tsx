"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import type {
  PublicSeoIntegrationsConfig,
  SeoGlobalConfig,
  SeoProviderHealth,
  SeoStructuredConfig,
} from "@/features/seo/types";
import { RobotsSettingsClient } from "./robots-settings-client";
import { StructuredDataSettingsClient } from "./structured-data-settings-client";
import { RedirectsSettingsPanel } from "./redirects-settings-panel";
import { IntegrationsConfigurePanel } from "./seo-integrations-configure-panel";
import { statusBadge } from "./seo-integrations-panels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SEO_SETTINGS_TABS,
  isValidSeoSettingsTab,
  type SeoSettingsTabId,
} from "./seo-settings-tabs";

type JsonLdRow = {
  pageKey: string | null;
  titleEn: string;
  entityType: string | null;
};

type RedirectRow = {
  id: string;
  fromPath: string;
  toPath: string;
  type: string;
};

export type SeoSettingsClientProps = {
  robotsConfig: SeoGlobalConfig;
  structuredConfig: SeoStructuredConfig;
  withJsonLd: JsonLdRow[];
  redirects: RedirectRow[];
  integrationsConfig: PublicSeoIntegrationsConfig;
  integrationHealth: SeoProviderHealth[];
  siteUrl: string;
  sitemapUrl: string;
};

export function SeoSettingsClient({
  robotsConfig,
  structuredConfig,
  withJsonLd,
  redirects,
  integrationsConfig,
  integrationHealth,
  siteUrl,
  sitemapUrl,
}: SeoSettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const activeTab = useMemo((): SeoSettingsTabId => {
    if (tabParam === "google-tags") return "integrations";
    return isValidSeoSettingsTab(tabParam) ? tabParam : "robots";
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    if (tabId !== "integrations") {
      params.delete("provider");
      params.delete("integrationsSaved");
    }
    router.replace(`/admin/seo/settings?${params.toString()}`, { scroll: false });
  };

  const bing = integrationsConfig.bing ?? {};
  const indexnow = integrationsConfig.indexnow ?? {};
  const nonGoogleHealth = integrationHealth.filter((item) => item.provider !== "google");

  return (
    <div className="max-w-6xl space-y-6">
      <AdminPageHeader
        title="SEO settings"
        description="Global SEO configuration: robots.txt, structured data, redirects, and Bing / IndexNow integrations."
      />

      <AdminSettingsLayout
        tabs={[...SEO_SETTINGS_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layoutId="seo-settings-ribbon"
      >
        {(tab) => {
          if (tab === "robots") {
            return <RobotsSettingsClient config={robotsConfig} siteUrl={siteUrl} embedded />;
          }

          if (tab === "structured") {
            return <StructuredDataSettingsClient config={structuredConfig} withJsonLd={withJsonLd} embedded />;
          }

          if (tab === "redirects") {
            return <RedirectsSettingsPanel redirects={redirects} embedded />;
          }

          return (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Google</CardTitle>
                  <CardDescription>
                    Analytics, Tag Manager, Search Console, and API ingestion are managed separately.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/admin/seo/google" className="text-sm text-primary underline">
                    Open Google settings
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Provider health</CardTitle>
                  <CardDescription>Status of Bing and IndexNow integrations.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {nonGoogleHealth.map((item) => (
                    <div key={item.provider} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium capitalize">{item.provider}</p>
                        {statusBadge(item)}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{item.message}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <IntegrationsConfigurePanel
                bing={bing}
                indexnow={indexnow}
                health={integrationHealth}
                siteUrl={siteUrl}
                sitemapUrl={sitemapUrl}
                embedded
              />
            </div>
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}
