"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  upsertSeoIntegrationsAction,
  type SeoActionResult,
} from "@/features/seo/actions";
import type {
  PublicSeoIntegrationProviderConfig,
  SeoProviderHealth,
} from "@/features/seo/types";
import { AdminSettingsRibbon } from "@/components/admin/layout/admin-settings-ribbon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  SEO_PROVIDER_TABS,
  isValidProviderTab,
  type SeoProviderTabId,
} from "./seo-integrations-tabs";

function ProviderCard({
  id,
  label,
  description,
  config,
  children,
}: {
  id: "bing" | "indexnow";
  label: string;
  description: string;
  config: PublicSeoIntegrationProviderConfig;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          {label}
          <label className="inline-flex items-center gap-2 text-sm font-normal">
            <input type="checkbox" name={`${id}.enabled`} value="true" defaultChecked={config.enabled} />
            Enabled
          </label>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function providerTabLabel(tabId: SeoProviderTabId, health: SeoProviderHealth[]): string {
  const item = health.find((h) => h.provider === tabId);
  const base = SEO_PROVIDER_TABS.find((t) => t.id === tabId)?.label ?? tabId;
  if (!item?.enabled) return base;
  if (!item.configured) return `${base} · setup`;
  if (!item.ok) return `${base} · degraded`;
  return base;
}

function buildIntegrationsUrl(embedded: boolean, params: URLSearchParams) {
  if (embedded) {
    params.set("tab", "integrations");
    return `/admin/seo/settings?${params.toString()}`;
  }
  params.set("tab", "configure");
  return `/admin/seo/integrations?${params.toString()}`;
}

type IntegrationsConfigurePanelProps = {
  bing: PublicSeoIntegrationProviderConfig;
  indexnow: PublicSeoIntegrationProviderConfig;
  health: SeoProviderHealth[];
  siteUrl: string;
  sitemapUrl: string;
  embedded?: boolean;
};

export function IntegrationsConfigurePanel({
  bing,
  indexnow,
  health,
  siteUrl,
  sitemapUrl,
  embedded = false,
}: IntegrationsConfigurePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saveState, saveAction, savePending] = useActionState<
    SeoActionResult | null,
    FormData
  >(upsertSeoIntegrationsAction, null);
  const prevSavePending = useRef(false);

  const providerParam = searchParams.get("provider");
  const providerTab = useMemo((): SeoProviderTabId => {
    return isValidProviderTab(providerParam) ? providerParam : "indexnow";
  }, [providerParam]);

  const formKey = [
    bing.enabled,
    indexnow.enabled,
  ].join("|");

  const providerTabs = SEO_PROVIDER_TABS.map((tab) => ({
    id: tab.id,
    label: providerTabLabel(tab.id, health),
  }));

  useEffect(() => {
    const justFinishedSave = prevSavePending.current && !savePending && saveState?.ok;
    prevSavePending.current = savePending;
    if (!justFinishedSave) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("provider", providerTab);
    params.set("integrationsSaved", "1");
    router.replace(buildIntegrationsUrl(embedded, params), { scroll: false });
    router.refresh();
  }, [savePending, saveState, router, searchParams, providerTab, embedded]);

  const handleProviderTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("provider", tabId);
    params.delete("integrationsSaved");
    router.replace(buildIntegrationsUrl(embedded, params), { scroll: false });
  };

  const dismissIntegrationsSaved = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("integrationsSaved");
    router.replace(buildIntegrationsUrl(embedded, params), { scroll: false });
  };

  const integrationsSaved = searchParams.get("integrationsSaved") === "1";

  return (
    <form key={formKey} action={saveAction} className="space-y-6">
      {!embedded ? (
        <p className="text-sm text-muted-foreground">
          Google Analytics, Tag Manager, and Search Console are in{" "}
          <Link href="/admin/seo/google" className="text-primary underline">
            Google settings
          </Link>
          . Robots.txt and other global SEO settings are in the sidebar under{" "}
          <Link href="/admin/seo/robots" className="text-primary underline">
            Robots.txt
          </Link>
          ,{" "}
          <Link href="/admin/seo/structured-data" className="text-primary underline">
            Structured Data
          </Link>
          , and{" "}
          <Link href="/admin/seo/redirects" className="text-primary underline">
            Redirects
          </Link>
          .
        </p>
      ) : null}

      <AdminSettingsRibbon
        tabs={providerTabs}
        activeTab={providerTab}
        onTabChange={handleProviderTabChange}
        layoutId="seo-integrations-provider-ribbon"
      />

      <div className={cn(providerTab !== "indexnow" && "hidden")}>
        <ProviderCard
          id="indexnow"
          label="IndexNow"
          description="Fast URL discovery for Bing, Yandex, Seznam, and other IndexNow participants."
          config={indexnow}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>API key {indexnow.hasApiKey ? "(saved)" : ""}</Label>
              <Input
                name="indexnow.apiKey"
                placeholder={indexnow.hasApiKey ? "Leave blank to keep saved key" : "IndexNow key"}
              />
            </div>
            <div className="space-y-2">
              <Label>Endpoint</Label>
              <Input
                name="indexnow.endpoint"
                defaultValue={indexnow.endpoint ?? ""}
                placeholder="https://api.indexnow.org/indexnow"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Key location</Label>
              <Input
                name="indexnow.keyLocation"
                defaultValue={indexnow.keyLocation ?? ""}
                placeholder="https://example.com/key.txt"
              />
            </div>
          </div>
        </ProviderCard>
      </div>

      <div className={cn(providerTab !== "bing" && "hidden")}>
        <ProviderCard
          id="bing"
          label="Bing Webmaster"
          description="Submit URLs and sitemap feeds through the Bing Webmaster API."
          config={bing}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="bing.analyticsEnabled"
                value="true"
                defaultChecked={bing.analyticsEnabled}
              />
              Enable Bing analytics ingestion
            </label>
            <div className="space-y-2">
              <Label>Site URL</Label>
              <Input
                name="bing.siteUrl"
                defaultValue={bing.siteUrl ?? siteUrl}
                placeholder={siteUrl}
              />
            </div>
            <div className="space-y-2">
              <Label>API key {bing.hasApiKey ? "(saved)" : ""}</Label>
              <Input
                name="bing.apiKey"
                placeholder={bing.hasApiKey ? "Leave blank to keep saved key" : "Bing API key"}
              />
            </div>
          </div>
        </ProviderCard>
      </div>

      {integrationsSaved ? (
        <p
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100"
          role="status"
        >
          <span>Integrations saved successfully.</span>
          <button
            type="button"
            className="text-xs underline underline-offset-2"
            onClick={dismissIntegrationsSaved}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      <div className="space-y-2">
        <Button type="submit" className="w-fit" disabled={savePending}>
          {savePending ? "Saving…" : "Save integrations"}
        </Button>
      </div>

      {saveState && !saveState.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {saveState.message}
        </p>
      ) : null}
    </form>
  );
}
