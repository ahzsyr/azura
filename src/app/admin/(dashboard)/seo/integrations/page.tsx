import Link from "next/link";
import { seoRepository } from "@/repositories/seo.repository";
import {
  enqueueSitemapSubmissionAction,
  runSeoAnalyticsIngestionAction,
  runSeoSubmissionQueueAction,
  upsertSeoIntegrationsAction,
} from "@/features/seo/actions";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import type {
  PublicSeoIntegrationProviderConfig,
  PublicSeoIntegrationsConfig,
  SeoProviderHealth,
} from "@/features/seo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function statusBadge(health: SeoProviderHealth) {
  if (!health.enabled) return <Badge variant="outline">Disabled</Badge>;
  if (!health.configured) {
    return <Badge className="bg-red-600 text-white border-transparent">Needs setup</Badge>;
  }
  return <Badge className={health.ok ? "bg-emerald-600" : "bg-amber-500"}>{health.message}</Badge>;
}

function ProviderCard({
  id,
  label,
  description,
  config,
  children,
}: {
  id: "google" | "bing" | "indexnow";
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

export default async function SeoIntegrationsPage() {
  let config: PublicSeoIntegrationsConfig = {};
  let health: SeoProviderHealth[] = [];
  let telemetry: Awaited<ReturnType<typeof seoRepository.getProviderTelemetryMetrics>> = [];
  let searchReport: Awaited<ReturnType<typeof seoRepository.getSearchMetricReport>> = {
    topPages: [],
    topQueries: [],
    totalClicks: 0,
    totalImpressions: 0,
  };
  let metrics: Awaited<ReturnType<typeof seoRepository.getSubmissionMetrics>> = {
    pending: 0,
    failed: 0,
    completed: 0,
    running: 0,
    exhausted: 0,
    failedLast24h: 0,
    stuck: 0,
    providerStats: [],
    recent: [],
  };

  try {
    [config, health, metrics, telemetry, searchReport] = await Promise.all([
      seoRepository.getPublicIntegrationsConfig(),
      seoIntegrationRegistry.health(),
      seoRepository.getSubmissionMetrics(),
      seoRepository.getProviderTelemetryMetrics(),
      seoRepository.getSearchMetricReport(),
    ]);
  } catch {
    // DB unavailable
  }

  const google = config.google ?? {};
  const bing = config.bing ?? {};
  const indexnow = config.indexnow ?? {};

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <Link href="/admin/seo" className="text-sm text-primary hover:underline">
          ← SEO
        </Link>
        <h1 className="font-heading mt-2 text-3xl font-semibold">SEO integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure external search platform submissions and monitor the outbound SEO queue.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Pending", metrics.pending],
          ["Running", metrics.running],
          ["Failed", metrics.failed],
          ["Exhausted", metrics.exhausted],
          ["Completed", metrics.completed],
          ["Failed 24h", metrics.failedLast24h],
          ["Stuck", metrics.stuck],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider health</CardTitle>
          <CardDescription>Credential and enablement status for each provider.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {health.map((item) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider success rates</CardTitle>
          <CardDescription>Based on the latest completed, failed, and exhausted jobs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {metrics.providerStats.map((provider) => (
            <div key={provider.provider} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium capitalize">{provider.provider}</p>
                <span className="text-lg font-semibold tabular-nums">{provider.successRate}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {provider.completed} completed · {provider.failed} failed · {provider.exhausted} exhausted
              </p>
            </div>
          ))}
          {metrics.providerStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No provider results yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider telemetry</CardTitle>
          <CardDescription>Reliability and latency from recorded submission events.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {telemetry.map((provider) => (
            <div key={provider.provider} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium capitalize">{provider.provider}</p>
                <span className="text-lg font-semibold tabular-nums">{provider.successRate}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                P95 {provider.p95LatencyMs}ms · {provider.volume} events · {provider.failures} failures
              </p>
            </div>
          ))}
          {telemetry.length === 0 ? (
            <p className="text-sm text-muted-foreground">No telemetry events recorded yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search analytics</CardTitle>
          <CardDescription>
            {searchReport.totalClicks} clicks and {searchReport.totalImpressions} impressions in the stored window.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">Top pages</h3>
            <div className="mt-2 space-y-2 text-sm">
              {searchReport.topPages.slice(0, 5).map((row) => (
                <div key={row.key} className="flex justify-between gap-3 border-b pb-2">
                  <span className="truncate text-muted-foreground">{row.key}</span>
                  <span className="font-medium tabular-nums">{row.clicks}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium">Top queries</h3>
            <div className="mt-2 space-y-2 text-sm">
              {searchReport.topQueries.slice(0, 5).map((row) => (
                <div key={row.key} className="flex justify-between gap-3 border-b pb-2">
                  <span className="truncate text-muted-foreground">{row.key}</span>
                  <span className="font-medium tabular-nums">{row.clicks}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <form action={upsertSeoIntegrationsAction} className="grid gap-4">
        <ProviderCard
          id="indexnow"
          label="IndexNow"
          description="Fast URL discovery for Bing, Yandex, Seznam, and other IndexNow participants."
          config={indexnow}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>API key {indexnow.hasApiKey ? "(saved)" : ""}</Label>
              <Input name="indexnow.apiKey" placeholder={indexnow.hasApiKey ? "Leave blank to keep saved key" : "IndexNow key"} />
            </div>
            <div className="space-y-2">
              <Label>Endpoint</Label>
              <Input name="indexnow.endpoint" defaultValue={indexnow.endpoint ?? ""} placeholder="https://api.indexnow.org/indexnow" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Key location</Label>
              <Input name="indexnow.keyLocation" defaultValue={indexnow.keyLocation ?? ""} placeholder="https://example.com/key.txt" />
            </div>
          </div>
        </ProviderCard>

        <ProviderCard
          id="bing"
          label="Bing Webmaster"
          description="Submit URLs and sitemap feeds through the Bing Webmaster API."
          config={bing}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="bing.analyticsEnabled" value="true" defaultChecked={bing.analyticsEnabled} />
              Enable Bing analytics ingestion
            </label>
            <div className="space-y-2">
              <Label>Site URL</Label>
              <Input name="bing.siteUrl" defaultValue={bing.siteUrl ?? ""} placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <Label>API key {bing.hasApiKey ? "(saved)" : ""}</Label>
              <Input name="bing.apiKey" placeholder={bing.hasApiKey ? "Leave blank to keep saved key" : "Bing API key"} />
            </div>
          </div>
        </ProviderCard>

        <ProviderCard
          id="google"
          label="Google Search Console"
          description="Submit sitemap updates to Search Console using an OAuth bearer token."
          config={google}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="google.analyticsEnabled" value="true" defaultChecked={google.analyticsEnabled} />
              Enable Google analytics ingestion
            </label>
            <div className="space-y-2">
              <Label>Site URL</Label>
              <Input name="google.siteUrl" defaultValue={google.siteUrl ?? ""} placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <Label>Bearer token {google.hasBearerToken ? "(saved)" : ""}</Label>
              <Input name="google.bearerToken" placeholder={google.hasBearerToken ? "Leave blank to keep saved token" : "OAuth access token"} />
            </div>
            <div className="space-y-2">
              <Label>OAuth client ID</Label>
              <Input name="google.clientId" defaultValue={google.clientId ?? ""} placeholder="Google OAuth client ID" />
            </div>
            <div className="space-y-2">
              <Label>OAuth client secret {google.hasClientSecret ? "(saved)" : ""}</Label>
              <Input name="google.clientSecret" placeholder={google.hasClientSecret ? "Leave blank to keep saved secret" : "Google OAuth client secret"} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Refresh token {google.hasRefreshToken ? "(saved)" : ""}</Label>
              <Input name="google.refreshToken" placeholder={google.hasRefreshToken ? "Leave blank to keep saved refresh token" : "Google OAuth refresh token"} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Service account JSON {google.hasServiceAccountJson ? "(saved)" : ""}</Label>
              <Textarea name="google.serviceAccountJson" rows={4} className="font-mono text-xs" placeholder="Reserved for service-account based auth automation" />
            </div>
          </div>
        </ProviderCard>

        <Button type="submit" className="w-fit">
          Save integrations
        </Button>
      </form>

      <div className="flex flex-wrap gap-3">
        <form action={enqueueSitemapSubmissionAction}>
          <Button type="submit" variant="outline">Queue sitemap submission</Button>
        </form>
        <form action={runSeoSubmissionQueueAction}>
          <Button type="submit">Run queue now</Button>
        </form>
        <form action={runSeoAnalyticsIngestionAction}>
          <Button type="submit" variant="outline">Run analytics sync</Button>
        </form>
        <Button asChild variant="outline">
          <Link href="/api/seo/analytics/google/oauth/start">Connect Google analytics</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pe-3">Provider</th>
                  <th className="py-2 pe-3">Kind</th>
                  <th className="py-2 pe-3">Status</th>
                  <th className="py-2 pe-3">URL</th>
                  <th className="py-2 pe-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recent.map((job) => (
                  <tr key={job.id} className="border-t">
                    <td className="py-2 pe-3">{job.provider}</td>
                    <td className="py-2 pe-3">{job.kind}</td>
                    <td className="py-2 pe-3">{job.status}</td>
                    <td className="max-w-[280px] truncate py-2 pe-3">{job.url}</td>
                    <td className="max-w-[280px] truncate py-2 pe-3 text-muted-foreground">
                      {job.lastError ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {metrics.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No submission jobs yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
