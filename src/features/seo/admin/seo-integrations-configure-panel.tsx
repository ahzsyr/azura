"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  upsertSeoIntegrationsAction,
  type SeoActionResult,
} from "@/features/seo/actions";
import type {
  PublicSeoIntegrationProviderConfig,
  SeoProviderHealth,
} from "@/features/seo/types";
import { GoogleIndexingKeyField } from "./google-indexing-key-field";
import { encodeServiceAccountJsonForTransport } from "@/features/seo/google-live/service-account-json";
import { AdminSettingsRibbon } from "@/components/admin/layout/admin-settings-ribbon";
import { useAdminFormDirtySync } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
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
  id: "bing" | "indexnow" | "google_indexing";
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
  const providerId = tabId === "google-indexing" ? "google_indexing" : tabId;
  const item = health.find((h) => h.provider === providerId);
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
  googleIndexing: PublicSeoIntegrationProviderConfig;
  health: SeoProviderHealth[];
  siteUrl: string;
  sitemapUrl: string;
  embedded?: boolean;
};

export function IntegrationsConfigurePanel({
  bing,
  indexnow,
  googleIndexing,
  health,
  siteUrl,
  sitemapUrl,
  embedded = false,
}: IntegrationsConfigurePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [googleIndexingJson, setGoogleIndexingJson] = useState("");
  const [transportError, setTransportError] = useState<string | null>(null);
  const [integrationsSaved, setIntegrationsSaved] = useState(false);
  const googleIndexingJsonRef = useRef(googleIndexingJson);
  googleIndexingJsonRef.current = googleIndexingJson;

  const [saveState, saveAction, savePending] = useActionState<
    SeoActionResult | null,
    FormData
  >(upsertSeoIntegrationsAction, null);
  const prevSavePending = useRef(false);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  useAdminFormDirtySync(formRef);

  const providerParam = searchParams.get("provider");
  const providerTab = useMemo((): SeoProviderTabId => {
    return isValidProviderTab(providerParam) ? providerParam : "indexnow";
  }, [providerParam]);

  const formKey = [
    bing.enabled,
    indexnow.enabled,
    googleIndexing.enabled,
    googleIndexing.hasServiceAccountJson,
  ].join("|");
  const googleIndexingJsonTransport = useMemo(() => {
    const json = googleIndexingJson.trim();
    if (!json) return "";
    try {
      return encodeServiceAccountJsonForTransport(json);
    } catch {
      return "";
    }
  }, [googleIndexingJson]);

  const providerTabs = SEO_PROVIDER_TABS.map((tab) => ({
    id: tab.id,
    label: providerTabLabel(tab.id, health),
  }));

  useEffect(() => {
    if (savePending) {
      prevSavePending.current = true;
      setSaveStatus("saving");
      return;
    }
    if (!prevSavePending.current) return;
    prevSavePending.current = false;

    if (saveState?.ok) {
      markSaved();
      setGoogleIndexingJson("");
      setIntegrationsSaved(true);
      const params = new URLSearchParams(searchParams.toString());
      params.set("provider", providerTab);
      params.delete("integrationsSaved");
      router.replace(buildIntegrationsUrl(embedded, params), { scroll: false });
      router.refresh();
    } else if (saveState && !saveState.ok) {
      setSaveStatus("error");
    }
  }, [
    savePending,
    saveState,
    router,
    searchParams,
    providerTab,
    embedded,
    markSaved,
    setSaveStatus,
  ]);

  const handleProviderTabChange = (tabId: string) => {
    setIntegrationsSaved(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("provider", tabId);
    params.delete("integrationsSaved");
    router.replace(buildIntegrationsUrl(embedded, params), { scroll: false });
  };

  const dismissIntegrationsSaved = () => {
    setIntegrationsSaved(false);
  };

  const handleSave = useCallback(() => {
    setTransportError(null);
    if (googleIndexingJsonRef.current.trim() && !googleIndexingJsonTransport) {
      setTransportError(
        "Could not encode the service account key for save. Re-import the key file and try again.",
      );
      setSaveStatus("error");
      return;
    }
    formRef.current?.requestSubmit();
  }, [googleIndexingJsonTransport, setSaveStatus]);

  const handleCancel = useCallback(() => {
    formRef.current?.reset();
    setGoogleIndexingJson("");
    setIntegrationsSaved(false);
  }, []);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      saveLabel: "Save integrations",
      selfManagedSaveStatus: true,
      canSave: !savePending,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel, savePending]);

  return (
    <form
      key={formKey}
      ref={formRef}
      id="seo-integrations-form"
      action={saveAction}
      className="space-y-6"
      onSubmit={() => {
        setTransportError(null);
        setIntegrationsSaved(false);
      }}
    >
      <input
        type="hidden"
        name="googleIndexingServiceAccountJsonB64"
        value={googleIndexingJsonTransport}
        readOnly
      />
      {!embedded ? (
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Google Analytics, Tag Manager, and Search Console are in{" "}
          <Link href="/admin/seo/google" className="text-primary underline underline-offset-2">
            Google settings
          </Link>
          . The Google Indexing API uses a service account (configured here) — it is separate from Google OAuth
          products. Robots.txt and other global SEO settings are in the sidebar under{" "}
          <Link href="/admin/seo/robots" className="text-primary underline underline-offset-2">
            Robots.txt
          </Link>
          ,{" "}
          <Link href="/admin/seo/structured-data" className="text-primary underline underline-offset-2">
            Structured Data
          </Link>
          , and{" "}
          <Link href="/admin/seo/redirects" className="text-primary underline underline-offset-2">
            Redirects
          </Link>
          .
        </div>
      ) : null}

      <AdminSettingsRibbon
        tabs={providerTabs}
        activeTab={providerTab}
        onTabChange={handleProviderTabChange}
        layoutId="seo-integrations-provider-ribbon"
        variant="sub"
      />

      <div className={cn(providerTab !== "indexnow" && "hidden")}>
        <ProviderCard
          id="indexnow"
          label="IndexNow"
          description="Notify Bing and other IndexNow engines when pages change. Use the live host only: https://brt-me.com (www.brt-me.com redirects there). IndexNow accepts page URLs only — send sitemap.xml through Bing or Google Search Console."
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
                placeholder="Leave blank, or https://brt-me.com/your-key.txt"
              />
              <p className="text-muted-foreground text-sm">
                Leave blank. The app serves the key at https://brt-me.com/{"{key}"}.txt — do not paste a Media
                upload URL. IndexNow rejects files that are not named exactly {"{your-key}"}.txt.{" "}
                <Link href="/admin/help#topic-seo-integrations" className="text-primary underline underline-offset-2">
                  Setup help
                </Link>
              </p>
            </div>
          </div>
        </ProviderCard>
      </div>

      <div className={cn(providerTab !== "google-indexing" && "hidden")}>
        <ProviderCard
          id="google_indexing"
          label="Google Indexing API"
          description="Notify Google when priority URLs are published or updated. Requires a Google Cloud service account with the Indexing API enabled and Owner access in Search Console."
          config={googleIndexing}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Step-by-step setup is in{" "}
              <Link href="/admin/help?page=seo-integrations&tab=configure" className="text-primary underline underline-offset-2">
                Help → Search Engines
              </Link>
              .
            </p>
            <GoogleIndexingKeyField
              hasSavedKey={Boolean(googleIndexing.hasServiceAccountJson)}
              value={googleIndexingJson}
              onChange={setGoogleIndexingJson}
            />
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

      <div className="space-y-2 lg:hidden">
        <Button type="submit" className="w-fit" disabled={savePending}>
          {savePending ? "Saving…" : "Save integrations"}
        </Button>
      </div>

      {transportError ? (
        <p className="text-sm text-destructive" role="alert">
          {transportError}
        </p>
      ) : null}

      {saveState && !saveState.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {saveState.message}
        </p>
      ) : null}
    </form>
  );
}
