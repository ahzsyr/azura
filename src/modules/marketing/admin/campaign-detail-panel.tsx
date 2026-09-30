"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminServerFormTopBarActions } from "@/components/admin/layout/admin-server-form-top-bar-actions";
import {
  AdminSettingsLayout,
  type SettingsRibbonTab,
} from "@/components/admin/layout/admin-settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateCampaignAction,
  addCampaignBindingAction,
  linkExternalCampaignAction,
  unlinkCampaignBindingAction,
  retryBoundCampaignSyncAction,
  createTrackingUrlAction,
} from "@/modules/marketing/actions";
import type { MarketingCampaignStatus } from "@prisma/client";
import type { CampaignPerformance } from "@/modules/marketing/campaigns/service";
import {
  buildGoogleAdsFinalUrlSuffix,
  buildShortShareUrl,
  getTrackingSiteOrigin,
} from "@/modules/marketing/tracking-urls/build-url";

type DetailCampaign = {
  id: string;
  internalId: string;
  name: string;
  status: MarketingCampaignStatus;
  objective: string | null;
  channel: string | null;
  landingPagePath: string | null;
  budget: number | null;
  budgetCurrency: string | null;
  targetAudience: string | null;
  targetLocation: string | null;
  description: string | null;
  notes: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  trackingUrls: Array<{
    id: string;
    fullUrl: string;
    baseUrl: string;
    label: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
  }>;
  providerBindings: Array<{
    id: string;
    providerId: string;
    externalCampaignId: string | null;
    externalCampaignName: string | null;
    syncStatus: string;
    lastSyncAt?: Date | string | null;
    lastSyncError?: string | null;
  }>;
};

type ExternalCampaignRow = {
  id: string;
  externalId: string;
  name: string;
  status: string;
  providerMetadata: unknown;
  providerBindingId: string | null;
  providerBinding: {
    id: string;
    campaignId: string;
    campaign: { id: string; name: string };
  } | null;
};

type AdAccountRow = {
  id: string;
  displayName: string;
  accountType: string;
  connection: { id: string; providerId: string; status: string };
  externalCampaigns?: ExternalCampaignRow[];
};

type BindingCard = {
  binding: {
    id: string;
    providerId: string;
    externalCampaignId: string | null;
    externalCampaignName: string | null;
    syncStatus: string;
    lastSyncAt: Date | string | null;
    lastMetricsSyncAt?: Date | string | null;
    lastSyncError: string | null;
    trackingUrls: Array<{ id: string; fullUrl: string; label: string | null }>;
    externalCampaigns: Array<{
      id: string;
      status: string;
      adGroups: Array<{
        id: string;
        name: string;
        ads: Array<{ id: string; name: string }>;
      }>;
    }>;
  };
  spend: number;
  impressions: number;
  clicks: number;
  adsConversions: number;
  channelType: string | null;
  googleStatus: string | null;
};

const DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "sessions", label: "Sessions" },
  { id: "leads", label: "Leads" },
  { id: "tracking", label: "Tracking" },
  { id: "settings", label: "Settings" },
  { id: "ads", label: "Ads" },
] as const;

type DetailTabId = (typeof DETAIL_TABS)[number]["id"];

function isDetailTab(id: string | null): id is DetailTabId {
  return DETAIL_TABS.some((t) => t.id === id);
}

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function CopyUrlButton({ url, label = "Copy" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

function Metric({
  title,
  value,
  format = "number",
}: {
  title: string;
  value: number;
  format?: "number" | "currency" | "percent";
}) {
  const display =
    format === "currency"
      ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      : format === "percent"
        ? `${(value * 100).toFixed(2)}%`
        : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{display}</p>
      </CardContent>
    </Card>
  );
}

function ScoreboardBlock({ performance }: { performance: CampaignPerformance }) {
  const g = performance.google ?? {
    spend: 0,
    impressions: 0,
    clicks: 0,
    adsConversions: 0,
    ctr: 0,
    cpc: 0,
  };
  const w = performance.website ?? {
    sessions: performance.sessions,
    pageViews: performance.pageViews,
    leads: performance.leads,
    qualifiedLeads: performance.qualifiedLeads,
    firstPartyConversions: 0,
  };
  const j = performance.joined ?? { cpl: 0, costPerQualifiedLead: 0 };
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Google Ads</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric title="Spend" value={g.spend} format="currency" />
          <Metric title="Impressions" value={g.impressions} />
          <Metric title="Clicks" value={g.clicks} />
          <Metric title="CTR" value={g.ctr} format="percent" />
          <Metric title="CPC" value={g.cpc} format="currency" />
          <Metric title="Ads conversions" value={g.adsConversions} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Website</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Sessions" value={w.sessions} />
          <Metric title="Page views" value={w.pageViews} />
          <Metric title="Leads" value={w.leads} />
          <Metric title="Qualified leads" value={w.qualifiedLeads} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Joined</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric title="Cost / lead" value={j.cpl} format="currency" />
          <Metric title="Cost / qualified lead" value={j.costPerQualifiedLead} format="currency" />
        </div>
      </div>
    </div>
  );
}

function ScrollPanel({ children }: { children: ReactNode }) {
  return (
    <div className="max-h-[min(28rem,calc(100dvh-16rem))] space-y-2 overflow-y-auto pr-1 text-sm">
      {children}
    </div>
  );
}

export function MarketingCampaignDetailPanel({
  campaign,
  performance,
  recentSessions,
  recentLeads,
  adAccounts,
  bindingCards = [],
}: {
  campaign: DetailCampaign;
  performance: CampaignPerformance;
  recentSessions: Array<{
    id: string;
    entryUrl: string | null;
    landingPagePath: string | null;
    deviceType: string | null;
    browser: string | null;
    country: string | null;
    region: string | null;
    startedAt: Date | string;
    visitorFirstSeenAt: Date | string;
    visitorLastSeenAt: Date | string;
  }>;
  recentLeads: Array<{
    id: string;
    createdAt: Date | string;
    landingPagePath: string | null;
    utmSource: string | null;
    utmCampaign: string | null;
    submissionId: string | null;
    inquiryId: string | null;
    submission: { pipelineType: string | null; status: string } | null;
    inquiry: { status: string; name: string; email: string } | null;
  }>;
  adAccounts: AdAccountRow[];
  bindingCards?: BindingCard[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: DetailTabId = isDetailTab(tabParam) ? tabParam : "overview";

  const tabs: SettingsRibbonTab[] = useMemo(
    () =>
      DETAIL_TABS.map((tab) => {
        if (tab.id === "sessions") {
          return { ...tab, label: `Sessions (${recentSessions.length})` };
        }
        if (tab.id === "leads") {
          return { ...tab, label: `Leads (${recentLeads.length})` };
        }
        if (tab.id === "tracking") {
          return { ...tab, label: `Tracking (${campaign.trackingUrls.length})` };
        }
        if (tab.id === "ads") {
          return { ...tab, label: `Ads (${campaign.providerBindings.length})` };
        }
        return tab;
      }),
    [
      campaign.providerBindings.length,
      campaign.trackingUrls.length,
      recentLeads.length,
      recentSessions.length,
    ],
  );

  const handleTabChange = (tabId: string) => {
    const next = isDetailTab(tabId) ? tabId : "overview";
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(
      qs
        ? `/admin/marketing/campaigns/${campaign.id}?${qs}`
        : `/admin/marketing/campaigns/${campaign.id}`,
      { scroll: false },
    );
  };

  const primaryUrl = buildShortShareUrl({
    campaignParam: campaign.internalId,
    siteOrigin: getTrackingSiteOrigin(),
  });

  return (
    <div className="space-y-5">
      {activeTab === "settings" ? (
        <AdminServerFormTopBarActions
          formId="marketing-campaign-edit-form"
          ownerKey="marketing-campaign-detail"
          saveLabel="Save campaign"
        />
      ) : null}

      <AdminPageHeader
        className="mb-0"
        title={campaign.name}
        description={`Analysis · a=${campaign.internalId} · ${campaign.status}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/marketing/campaigns">Back to campaigns</Link>
          </Button>
        }
      />

      <AdminSettingsLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layoutId="marketing-campaign-detail-ribbon"
      >
        {(tab) => {
          if (tab === "overview") {
            return (
              <div className="space-y-5">
                {primaryUrl ? (
                  <Card className="border-primary/20 bg-muted/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Share tracking link</CardTitle>
                      <CardDescription>
                        Visitors land on a clean URL; attribution is recorded internally.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-start gap-2">
                      <code className="min-w-0 flex-1 break-all rounded border bg-background px-3 py-2 text-sm">
                        {primaryUrl}
                      </code>
                      <CopyUrlButton url={primaryUrl} label="Copy link" />
                    </CardContent>
                  </Card>
                ) : null}

                <div>
                  <p className="mb-2 text-sm font-medium">Campaign scoreboard</p>
                  <ScoreboardBlock performance={performance} />
                </div>
              </div>
            );
          }

          if (tab === "sessions") {
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent sessions</CardTitle>
                  <CardDescription>Attributed visits from the campaign share link.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollPanel>
                    {recentSessions.length === 0 ? (
                      <p className="text-muted-foreground">No attributed sessions yet.</p>
                    ) : (
                      recentSessions.map((s) => (
                        <div key={s.id} className="rounded border px-2 py-1.5">
                          <div className="font-medium">{s.landingPagePath ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {[s.deviceType, s.browser, s.country, s.region]
                              .filter(Boolean)
                              .join(" · ") || "Device unknown"}
                            {" · "}
                            {new Date(s.startedAt).toLocaleString()}
                          </div>
                          {s.entryUrl ? (
                            <code className="mt-0.5 block break-all text-xs text-muted-foreground">
                              {s.entryUrl}
                            </code>
                          ) : null}
                        </div>
                      ))
                    )}
                  </ScrollPanel>
                </CardContent>
              </Card>
            );
          }

          if (tab === "leads") {
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent leads</CardTitle>
                  <CardDescription>Conversions attributed to this campaign.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollPanel>
                    {recentLeads.length === 0 ? (
                      <p className="text-muted-foreground">No attributed leads yet.</p>
                    ) : (
                      recentLeads.map((l) => {
                        const kind = l.submissionId
                          ? "Form"
                          : l.inquiryId
                            ? "Inquiry"
                            : "Lead";
                        const qualified =
                          l.submission?.pipelineType === "qualified" ||
                          l.inquiry?.status === "CONTACTED";
                        return (
                          <div key={l.id} className="flex justify-between gap-2 border-b py-1.5">
                            <div>
                              <span className="font-medium">{kind}</span>
                              {qualified ? (
                                <span className="ml-2 text-xs text-emerald-600">qualified</span>
                              ) : null}
                              <div className="text-xs text-muted-foreground">
                                {l.landingPagePath ?? "—"} · {l.utmSource ?? "—"}
                              </div>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {new Date(l.createdAt).toLocaleString()}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </ScrollPanel>
                </CardContent>
              </Card>
            );
          }

          if (tab === "tracking") {
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tracking URLs</CardTitle>
                  <CardDescription>
                    Share the short link. Landing stays clean for visitors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ScrollPanel>
                    {campaign.trackingUrls.length === 0 ? (
                      <p className="text-muted-foreground">No tracking URLs yet.</p>
                    ) : (
                      campaign.trackingUrls.map((u) => {
                        const shareUrl = buildShortShareUrl({
                          campaignParam: campaign.internalId,
                          siteOrigin: getTrackingSiteOrigin(),
                        });
                        return (
                          <div key={u.id} className="rounded border p-2">
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium">{u.label ?? "Tracking URL"}</span>
                              <CopyUrlButton url={shareUrl} />
                            </div>
                            <code className="block break-all text-xs">{shareUrl}</code>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Lands on {u.baseUrl || campaign.landingPagePath || "/"}
                              {[u.utmSource, u.utmMedium, u.utmContent].filter(Boolean).length
                                ? ` · ${[u.utmSource, u.utmMedium, u.utmContent]
                                    .filter(Boolean)
                                    .join(" / ")}`
                                : ""}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </ScrollPanel>

                  <details className="rounded border p-3">
                    <summary className="cursor-pointer font-medium">Add variant tracking URL</summary>
                    <form
                      action={createTrackingUrlAction}
                      className="mt-3 grid gap-2 md:grid-cols-2"
                    >
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <Input
                        name="baseUrl"
                        required
                        placeholder="Landing path (e.g. /contact)"
                        defaultValue={campaign.landingPagePath ?? "/"}
                        className="md:col-span-2"
                      />
                      <Input name="utmSource" placeholder="utm_source (optional)" />
                      <Input name="utmMedium" placeholder="utm_medium (optional)" />
                      <Input name="utmContent" placeholder="utm_content (optional)" />
                      <Input name="label" placeholder="Label" defaultValue="Variant" />
                      <Button type="submit" size="sm" className="w-fit">
                        Create URL
                      </Button>
                    </form>
                  </details>
                </CardContent>
              </Card>
            );
          }

          if (tab === "settings") {
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Edit campaign</CardTitle>
                  <CardDescription>Name, landing page, status, and dates.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    id="marketing-campaign-edit-form"
                    data-admin-save-form=""
                    action={updateCampaignAction}
                    className="grid max-h-[min(32rem,calc(100dvh-16rem))] gap-3 overflow-y-auto pr-1 md:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={campaign.id} />
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" required defaultValue={campaign.name} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Identifier</Label>
                      <Input value={campaign.internalId} disabled />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="landingPagePath">Landing page</Label>
                      <Input
                        id="landingPagePath"
                        name="landingPagePath"
                        defaultValue={campaign.landingPagePath ?? ""}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="channel">Channel</Label>
                      <Input id="channel" name="channel" defaultValue={campaign.channel ?? ""} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        name="status"
                        defaultValue={campaign.status}
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      >
                        {["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"].map(
                          (s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="startDate">Start date</Label>
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        defaultValue={toDateInput(campaign.startDate)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="endDate">End date</Label>
                      <Input
                        id="endDate"
                        name="endDate"
                        type="date"
                        defaultValue={toDateInput(campaign.endDate)}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Input id="notes" name="notes" defaultValue={campaign.notes ?? ""} />
                    </div>
                  </form>
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Google Ads + website results</CardTitle>
                  <CardDescription>
                    Internal campaign is the scoreboard. Linked Google campaigns are execution
                    objects.{" "}
                    <Link
                      href="/admin/help#topic-marketing-campaigns"
                      className="font-medium text-foreground underline underline-offset-2"
                    >
                      How to link Google Ads campaigns
                    </Link>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScoreboardBlock performance={performance} />
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Linked Google campaigns</h3>
                {bindingCards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No Google Ads campaigns linked yet.</p>
                ) : (
                  bindingCards.map((card) => {
                    const suffix = buildGoogleAdsFinalUrlSuffix({
                      internalId: campaign.internalId,
                      bindingId: card.binding.id,
                    });
                    return (
                      <Card key={card.binding.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            {card.binding.externalCampaignName ??
                              card.binding.externalCampaignId ??
                              "Google campaign"}
                          </CardTitle>
                          <CardDescription>
                            {card.channelType ?? "Campaign"} · {card.googleStatus ?? "unknown"} ·{" "}
                            {card.binding.syncStatus}
                            {card.binding.lastSyncAt
                              ? ` · last sync ${new Date(card.binding.lastSyncAt).toLocaleString()}`
                              : ""}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          {card.binding.lastSyncError ? (
                            <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
                              Sync error: {card.binding.lastSyncError}
                            </p>
                          ) : null}
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div>
                              Spend: ${card.spend.toFixed(2)}
                            </div>
                            <div>Clicks: {card.clicks}</div>
                            <div>Impressions: {card.impressions}</div>
                            <div>Ads conv: {card.adsConversions}</div>
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">Final URL suffix</p>
                            <code className="block break-all rounded border bg-muted/40 px-2 py-1 text-xs">
                              {suffix}
                            </code>
                            <CopyUrlButton url={suffix} label="Copy suffix" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <form action={retryBoundCampaignSyncAction}>
                              <input type="hidden" name="bindingId" value={card.binding.id} />
                              <input type="hidden" name="campaignId" value={campaign.id} />
                              <Button type="submit" size="sm" variant="outline">
                                Retry sync
                              </Button>
                            </form>
                            <form action={unlinkCampaignBindingAction}>
                              <input type="hidden" name="bindingId" value={card.binding.id} />
                              <input type="hidden" name="campaignId" value={campaign.id} />
                              <Button type="submit" size="sm" variant="outline">
                                Unlink
                              </Button>
                            </form>
                            {card.binding.providerId === "google-ads" ? (
                              <Button asChild size="sm" variant="ghost">
                                <a href="/admin/seo/google?tab=ads">Reconnect in SEO Google</a>
                              </Button>
                            ) : null}
                          </div>
                          {card.binding.externalCampaigns[0]?.adGroups?.length ? (
                            <div className="text-xs text-muted-foreground">
                              {card.binding.externalCampaigns[0].adGroups.length} ad groups ·{" "}
                              {card.binding.externalCampaigns[0].adGroups.reduce(
                                (n, g) => n + g.ads.length,
                                0,
                              )}{" "}
                              ads synced
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Link Google campaign</CardTitle>
                  <CardDescription>
                    Select a synced Google Ads customer and campaign. Do not type IDs unless using Advanced.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {adAccounts
                    .filter((a) => a.connection.providerId === "google-ads")
                    .map((account) => (
                      <div key={account.id} className="space-y-2 rounded border p-3">
                        <p className="font-medium">{account.displayName}</p>
                        {(account.externalCampaigns ?? []).length === 0 ? (
                          <p className="text-muted-foreground">
                            No synced campaigns. Sync from Ad Accounts first.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {(account.externalCampaigns ?? []).map((ext) => {
                              const linkedHere =
                                ext.providerBinding?.campaignId === campaign.id;
                              const linkedElsewhere =
                                ext.providerBinding &&
                                ext.providerBinding.campaignId !== campaign.id;
                              const meta =
                                ext.providerMetadata &&
                                typeof ext.providerMetadata === "object" &&
                                !Array.isArray(ext.providerMetadata)
                                  ? (ext.providerMetadata as Record<string, unknown>)
                                  : {};
                              return (
                                <li
                                  key={ext.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5"
                                >
                                  <div>
                                    <div className="font-medium">{ext.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {String(meta.channelType ?? "campaign")} · {ext.status} ·{" "}
                                      {ext.externalId}
                                    </div>
                                    {linkedElsewhere ? (
                                      <div className="text-xs text-amber-700 dark:text-amber-300">
                                        Linked to {ext.providerBinding!.campaign.name}
                                      </div>
                                    ) : null}
                                  </div>
                                  {linkedHere ? (
                                    <span className="text-xs text-emerald-700 dark:text-emerald-300">
                                      Linked to this campaign
                                    </span>
                                  ) : linkedElsewhere ? null : (
                                    <form action={linkExternalCampaignAction}>
                                      <input type="hidden" name="campaignId" value={campaign.id} />
                                      <input type="hidden" name="adAccountId" value={account.id} />
                                      <input
                                        type="hidden"
                                        name="externalCampaignId"
                                        value={ext.externalId}
                                      />
                                      <input type="hidden" name="providerId" value="google-ads" />
                                      <input
                                        type="hidden"
                                        name="externalCampaignName"
                                        value={ext.name}
                                      />
                                      <Button type="submit" size="sm">
                                        Link
                                      </Button>
                                    </form>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}

                  <details className="rounded border p-3">
                    <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Manual external ID fallback — prefer the picker above.
                    </p>
                    <form action={addCampaignBindingAction} className="mt-3 grid gap-2 md:grid-cols-4">
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <select
                        name="providerId"
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        required
                        defaultValue="google-ads"
                      >
                        <option value="google-ads">Google Ads</option>
                        <option value="meta">Meta</option>
                        <option value="linkedin">LinkedIn</option>
                      </select>
                      <select
                        name="adAccountId"
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                      >
                        <option value="">Ad account (optional)</option>
                        {adAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.connection.providerId}: {a.displayName}
                          </option>
                        ))}
                      </select>
                      <Input name="externalCampaignId" placeholder="External campaign ID" />
                      <Input name="externalCampaignName" placeholder="External campaign name" />
                      <Button type="submit" size="sm" className="w-fit md:col-span-4">
                        Add binding (advanced)
                      </Button>
                    </form>
                  </details>
                </CardContent>
              </Card>
            </div>
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}
