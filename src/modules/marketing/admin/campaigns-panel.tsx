"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Target } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsRibbon } from "@/components/admin/layout/admin-settings-ribbon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CampaignCreateModal } from "@/modules/marketing/admin/campaign-create-modal";
import { buildShortShareUrl, getTrackingSiteOrigin } from "@/modules/marketing/tracking-urls/build-url";
import type { MarketingCampaignStatus } from "@prisma/client";

type CampaignRow = {
  id: string;
  internalId: string;
  name: string;
  status: MarketingCampaignStatus;
  channel: string | null;
  landingPagePath: string | null;
  trackingUrls: Array<{ id: string; fullUrl: string; label: string | null }>;
  providerBindings?: Array<{
    id: string;
    providerId: string;
    syncStatus: string;
    lastSyncAt?: Date | string | null;
  }>;
  _count: { trackingUrls: number; conversions: number; leadAttributions: number };
  performance?: {
    pageViews: number;
    sessions: number;
    leads: number;
    qualifiedLeads: number;
    google?: { spend: number; clicks: number; impressions: number };
    googleBindingCount?: number;
  };
};

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "DRAFT", label: "Draft" },
  { id: "PAUSED", label: "Paused" },
  { id: "COMPLETED", label: "Completed" },
  { id: "ARCHIVED", label: "Archived" },
  { id: "google_linked", label: "Google linked" },
  { id: "google_unlinked", label: "Google unlinked" },
  { id: "sync_error", label: "Sync error" },
  { id: "stale", label: "Stale" },
] as const;

type StatusTabId = (typeof STATUS_TABS)[number]["id"];

function isStatusTab(id: string | null): id is StatusTabId {
  return STATUS_TABS.some((t) => t.id === id);
}

function CopyUrlButton({ url }: { url: string }) {
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
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

function MetricChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border px-2.5 py-1.5 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function MarketingCampaignsPanel({ campaigns }: { campaigns: CampaignRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const activeTab: StatusTabId = isStatusTab(statusParam) ? statusParam : "all";
  const [createOpen, setCreateOpen] = useState(false);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: campaigns.length };
    for (const c of campaigns) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    }
    byStatus.google_linked = campaigns.filter((c) =>
      (c.providerBindings ?? []).some((b) => b.providerId === "google-ads"),
    ).length;
    byStatus.google_unlinked = campaigns.length - (byStatus.google_linked ?? 0);
    byStatus.sync_error = campaigns.filter((c) =>
      (c.providerBindings ?? []).some((b) => b.syncStatus === "error"),
    ).length;
    const dayAgo = Date.now() - 36 * 3600 * 1000;
    byStatus.stale = campaigns.filter((c) =>
      (c.providerBindings ?? []).some((b) => {
        if (b.providerId !== "google-ads") return false;
        if (!b.lastSyncAt) return true;
        return new Date(b.lastSyncAt).getTime() < dayAgo;
      }),
    ).length;
    return byStatus;
  }, [campaigns]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return campaigns;
    if (activeTab === "google_linked") {
      return campaigns.filter((c) =>
        (c.providerBindings ?? []).some((b) => b.providerId === "google-ads"),
      );
    }
    if (activeTab === "google_unlinked") {
      return campaigns.filter(
        (c) => !(c.providerBindings ?? []).some((b) => b.providerId === "google-ads"),
      );
    }
    if (activeTab === "sync_error") {
      return campaigns.filter((c) =>
        (c.providerBindings ?? []).some((b) => b.syncStatus === "error"),
      );
    }
    if (activeTab === "stale") {
      const dayAgo = Date.now() - 36 * 3600 * 1000;
      return campaigns.filter((c) =>
        (c.providerBindings ?? []).some((b) => {
          if (!b.lastSyncAt) return true;
          return new Date(b.lastSyncAt).getTime() < dayAgo;
        }),
      );
    }
    return campaigns.filter((c) => c.status === activeTab);
  }, [campaigns, activeTab]);

  const handleTabChange = (tabId: string) => {
    const next = isStatusTab(tabId) ? tabId : "all";
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("status");
    else params.set("status", next);
    const qs = params.toString();
    router.replace(qs ? `/admin/marketing/campaigns?${qs}` : "/admin/marketing/campaigns", {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Campaigns"
        description="Create a campaign with a name and identifier. We generate a tracking link for your landing page. When people visit through that link, their visit and activity are recorded on this campaign. This section lists campaigns with metrics and analysis."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            New campaign
          </Button>
        }
      />

      <AdminSettingsRibbon
        tabs={STATUS_TABS.map((tab) => ({
          id: tab.id,
          label:
            tab.id === "all"
              ? `All (${counts.all ?? 0})`
              : `${tab.label} (${counts[tab.id] ?? 0})`,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layoutId="marketing-campaigns-ribbon"
        variant="wrap"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {campaigns.length === 0
              ? "No campaigns yet"
              : `No ${activeTab === "all" ? "" : activeTab.toLowerCase() + " "}campaigns`}
          </p>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">
            {campaigns.length === 0
              ? "Create a campaign to get a shareable tracking link."
              : "Try another status tab, or create a new campaign."}
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            New campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((campaign) => {
            // Always show short share link in the list (even for older long fullUrl rows)
            const primaryUrl = buildShortShareUrl({
              campaignParam: campaign.internalId,
              siteOrigin: getTrackingSiteOrigin(),
            });
            const perf = campaign.performance;
            return (
              <Card key={campaign.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        <Link
                          href={`/admin/marketing/campaigns/${campaign.id}`}
                          className="hover:underline"
                        >
                          {campaign.name}
                        </Link>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        <code>a={campaign.internalId}</code> · {campaign.status}
                        {campaign.landingPagePath ? ` · ${campaign.landingPagePath}` : ""}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/marketing/campaigns/${campaign.id}`}>Analysis</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {primaryUrl ? (
                    <div className="flex flex-wrap items-start gap-2">
                      <code className="min-w-0 flex-1 break-all rounded border bg-muted/40 px-2 py-1 text-xs">
                        {primaryUrl}
                      </code>
                      <CopyUrlButton url={primaryUrl} />
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No tracking URL yet.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <MetricChip
                      label="Google Ads"
                      value={
                        (campaign.performance?.googleBindingCount ??
                          (campaign.providerBindings ?? []).filter((b) => b.providerId === "google-ads")
                            .length) ||
                        "—"
                      }
                    />
                    <MetricChip
                      label="Spend"
                      value={
                        campaign.performance?.google?.spend != null
                          ? `$${campaign.performance.google.spend.toFixed(0)}`
                          : "—"
                      }
                    />
                    <MetricChip
                      label="Clicks"
                      value={campaign.performance?.google?.clicks ?? "—"}
                    />
                    <MetricChip
                      label="Leads"
                      value={perf?.leads ?? campaign._count.leadAttributions}
                    />
                    <MetricChip label="Qualified" value={perf?.qualifiedLeads ?? 0} />
                  </div>
                  {(campaign.providerBindings ?? []).some((b) => b.syncStatus === "error") ? (
                    <p className="text-xs text-destructive">Google Ads sync error</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignCreateModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
