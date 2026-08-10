import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsGoogleWorkspace } from "@/features/search-intelligence/workspaces/server";
import {
  ActionButton,
  ActionPanel,
  SearchOpsSubnav,
} from "@/features/search-intelligence/workspaces/ui";
import {
  enqueueSearchOperationAction,
  testSearchOpsConnectorAction,
} from "@/features/search-intelligence/workspaces/actions";
import { CONNECTOR_DEFINITIONS } from "@/features/search-intelligence/integrations";
import { loadGooglePlatformAdminData } from "@/features/seo/google-platform/server";
import {
  runGoogleOperationFormAction,
  testGoogleIntegrationFormAction,
} from "@/features/seo/google-platform/actions";
import type { GoogleIntegrationId } from "@/features/seo/google-platform/types";

export const dynamic = "force-dynamic";

function statusBadge(connected: boolean, state: string) {
  if (connected || state === "ready" || state === "syncing") {
    return <Badge className="bg-emerald-600 text-white border-transparent">Connected</Badge>;
  }
  if (state === "configuring") {
    return <Badge className="bg-amber-500 text-white border-transparent">{state}</Badge>;
  }
  if (state === "error" || state === "rate_limited") {
    return <Badge className="bg-destructive text-destructive-foreground border-transparent">{state}</Badge>;
  }
  return <Badge variant="outline">Disconnected</Badge>;
}

function relativeTime(value?: string | null) {
  if (!value) return "—";
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "—";
  const delta = Date.now() - ts;
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(value).toLocaleString();
}

export default async function SearchOpsGoogleWorkspace() {
  const [{ platform, snapshots, health }, googlePlatform] = await Promise.all([
    getSearchOperationsGoogleWorkspace(),
    loadGooglePlatformAdminData({ public: true }),
  ]);
  const siteOrigin = platform.siteOrigin;
  const { summary, cards } = googlePlatform;

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Google"
        description="Google Operations Center: registry-driven health, quotas, jobs, and run-now actions."
      />
      <SearchOpsSubnav active="Google" />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Google Workspace</CardTitle>
          <CardDescription>
            Connected Services {summary.connectedServices} / {summary.totalServices} · Healthy{" "}
            {summary.healthy} · Warnings {summary.warnings} · Errors {summary.errors}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-md border px-3 py-2">
            <div className="text-muted-foreground">Running Jobs</div>
            <div className="font-semibold">{summary.runningJobs}</div>
          </div>
          <div className="rounded-md border px-3 py-2">
            <div className="text-muted-foreground">Pending Jobs</div>
            <div className="font-semibold">{summary.pendingJobs}</div>
          </div>
          <div className="rounded-md border px-3 py-2">
            <div className="text-muted-foreground">OAuth Status</div>
            <div className="font-semibold capitalize">{summary.oauthStatus}</div>
          </div>
          <div className="rounded-md border px-3 py-2">
            <div className="text-muted-foreground">API Quota</div>
            <div className="font-semibold">
              {summary.apiQuotaPercent == null ? "—" : `${summary.apiQuotaPercent}%`}
            </div>
          </div>
          <div className="rounded-md border px-3 py-2">
            <div className="text-muted-foreground">Last Authentication</div>
            <div className="font-semibold">{relativeTime(summary.lastAuthentication)}</div>
          </div>
          <div className="rounded-md border px-3 py-2">
            <div className="text-muted-foreground">Background Workers</div>
            <div className="font-semibold capitalize">{summary.backgroundWorkers}</div>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/admin/seo/google" className="text-primary hover:underline">
              Open Google hub
            </Link>
            <Link href="/admin/seo/google?tab=settings" className="text-primary hover:underline">
              Global settings
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const status = health.find((h) => h.connectorId === card.id);
          const snap = snapshots.find((s) => s.id === card.id);
          const def = CONNECTOR_DEFINITIONS.find((d) => d.id === card.id);
          return (
            <Card key={card.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{card.displayName}</CardTitle>
                  {statusBadge(card.connected, status?.state ?? "disconnected")}
                </div>
                <CardDescription className="line-clamp-2">{card.healthMessage}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <div className="grid grid-cols-2 gap-2">
                  <span>Health {card.healthScore}%</span>
                  <span>
                    Quota{" "}
                    {card.quotaMaximum != null
                      ? `${card.quotaCurrent ?? 0} / ${card.quotaMaximum}`
                      : "—"}
                  </span>
                  <span>Pending {card.pendingJobs}</span>
                  <span>Errors {card.errors}</span>
                  <span>Warnings {card.warnings}</span>
                  <span>Last sync {relativeTime(card.lastSyncAt)}</span>
                </div>
                {def ? <div>cadence {def.syncCadenceMinutes}m</div> : null}
                <div className="flex flex-wrap gap-2">
                  <Link href={card.configureHref} className="text-primary hover:underline">
                    Open
                  </Link>
                  <Link href={card.configureHref} className="text-primary hover:underline">
                    Configure
                  </Link>
                  {card.primaryOperations[0] ? (
                    <form action={runGoogleOperationFormAction}>
                      <input type="hidden" name="integrationId" value={card.id} />
                      <input type="hidden" name="operationId" value={card.primaryOperations[0].id} />
                      <Button type="submit" size="sm" variant="outline">
                        {card.primaryOperations[0].title}
                      </Button>
                    </form>
                  ) : null}
                  {card.supportsValidation ? (
                    <form action={testGoogleIntegrationFormAction}>
                      <input type="hidden" name="integrationId" value={card.id as GoogleIntegrationId} />
                      <Button type="submit" size="sm" variant="outline">
                        Validate
                      </Button>
                    </form>
                  ) : null}
                  {snap?.testable ? (
                    <form action={testSearchOpsConnectorAction}>
                      <input type="hidden" name="connectorId" value={card.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Test
                      </Button>
                    </form>
                  ) : null}
                  {card.supportsHistory ? (
                    <Link
                      href={`${card.configureHref}#history`}
                      className="text-primary hover:underline self-center"
                    >
                      Logs
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ActionPanel
        title="Executable Google actions"
        description="Runs live Google APIs when credentials are configured (PageSpeed key, Search Console OAuth, Indexing service account, Business Profile token). Failed runs show the error and a View result link — they never fake success."
      >
        <ActionButton
          formAction={async () => {
            "use server";
            return enqueueSearchOperationAction({
              definitionId: "google.request_indexing",
              payload: { url: siteOrigin },
              executeNow: true,
            });
          }}
        >
          Request Indexing
        </ActionButton>
        <ActionButton
          formAction={async () => {
            "use server";
            return enqueueSearchOperationAction({
              definitionId: "sitemap.rebuild",
              executeNow: true,
            });
          }}
        >
          Rebuild Sitemap
        </ActionButton>
        <ActionButton
          formAction={async () => {
            "use server";
            return enqueueSearchOperationAction({
              definitionId: "google.sync_business_profile",
              executeNow: true,
            });
          }}
        >
          Sync Business Profile
        </ActionButton>
        <ActionButton
          formAction={async () => {
            "use server";
            return enqueueSearchOperationAction({
              definitionId: "google.run_pagespeed",
              payload: { url: siteOrigin },
              executeNow: true,
            });
          }}
        >
          Run PageSpeed
        </ActionButton>
        <ActionButton
          formAction={async () => {
            "use server";
            return enqueueSearchOperationAction({
              definitionId: "page.inspect_url",
              payload: { url: siteOrigin },
              executeNow: true,
            });
          }}
        >
          Inspect Homepage
        </ActionButton>
      </ActionPanel>
    </div>
  );
}
