"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Facebook,
  Linkedin,
  Share2,
  ShieldCheck,
  Unplug,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import {
  AdminSettingsLayout,
  type SettingsRibbonTab,
} from "@/components/admin/layout/admin-settings-layout";
import { MarketingProviderCredentialsForms } from "@/modules/marketing/admin/provider-credentials-forms";
import type { PublicMarketingProviderAppConfig } from "@/modules/marketing/providers/app-config";
import { cn } from "@/lib/utils";

type Platform = Awaited<
  ReturnType<typeof import("@/modules/marketing/service").marketingService.listPlatformOverview>
>[number];

type TabStatus = NonNullable<SettingsRibbonTab["status"]>;

const CAPABILITY_LABELS: Record<string, string> = {
  connection: "Connection",
  publishing: "Publishing",
  analytics: "Analytics",
  tracking: "Tracking",
  leadSync: "Lead sync",
  messaging: "Messaging",
  advertising: "Advertising",
  commerce: "Commerce",
};

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  Facebook,
  Linkedin,
  meta: Facebook,
  linkedin: Linkedin,
};

const PLATFORM_ACCENT: Record<string, string> = {
  meta: "bg-[#1877F2]/12 text-[#1877F2] ring-[#1877F2]/20",
  linkedin: "bg-[#0A66C2]/12 text-[#0A66C2] ring-[#0A66C2]/20",
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  linkedin: "LinkedIn",
};

function formatConnectionError(error: string) {
  if (error === "marketing_schema_missing") {
    return "Marketing database tables are missing. Redeploy so database migrations run, then try Connect again.";
  }
  if (error.includes("missing_client")) {
    return `Connection error: ${error} — save Client ID / Secret below, then try Connect again.`;
  }
  return `Connection error: ${error}`;
}

function credentialsReady(platformId: string, config?: PublicMarketingProviderAppConfig) {
  if (!config?.clientId) return false;
  if (platformId === "meta") return Boolean(config.hasClientSecret || config.hasAppSecret);
  return Boolean(config.hasClientSecret);
}

function connectionLabel(status?: string | null) {
  if (!status) return "Not connected";
  return status.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isConnectedStatus(status?: string | null) {
  return status === "connected" || status === "healthy";
}

function platformTabStatus(
  platform: Platform | undefined,
  config: PublicMarketingProviderAppConfig | undefined,
  providerId: string,
): TabStatus {
  const status = platform?.connection?.status;
  if (status === "degraded") return "warning";
  if (isConnectedStatus(status)) return "connected";
  if (!credentialsReady(providerId, config)) return "setup";
  return "disconnected";
}

function PlatformIcon({ platform }: { platform: Pick<Platform, "id" | "icon"> | { id: string; icon?: string } }) {
  const Icon =
    PLATFORM_ICONS[platform.icon ?? ""] ?? PLATFORM_ICONS[platform.id] ?? Share2;
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
        PLATFORM_ACCENT[platform.id] ?? "bg-muted text-muted-foreground ring-border/60",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

function StatusBadge({
  status,
  ready,
}: {
  status?: string | null;
  ready: boolean;
}) {
  if (isConnectedStatus(status)) {
    return (
      <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600">
        Connected
      </Badge>
    );
  }
  if (status === "degraded") {
    return (
      <Badge className="border-transparent bg-amber-500 text-white hover:bg-amber-500">
        Degraded
      </Badge>
    );
  }
  if (!ready) {
    return (
      <Badge variant="outline" className="text-sky-700 dark:text-sky-300">
        Setup needed
      </Badge>
    );
  }
  return <Badge variant="outline">{connectionLabel(status)}</Badge>;
}

function PlatformOverviewCard({
  platform,
  config,
  onOpen,
}: {
  platform: Platform;
  config?: PublicMarketingProviderAppConfig;
  onOpen: () => void;
}) {
  const ready = credentialsReady(platform.id, config);
  const status = platform.connection?.status;
  const availableCaps = platform.capabilities.filter((c) => c.available).length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Card className="h-full border-border/70 shadow-sm transition-[border-color,box-shadow,transform] duration-150 group-hover:border-border group-hover:shadow-md group-active:scale-[0.99]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <PlatformIcon platform={platform} />
              <div className="min-w-0">
                <CardTitle className="text-base">{platform.displayName}</CardTitle>
                <CardDescription className="mt-0.5">
                  API {platform.version.apiVersion}
                  {platform.compatibility.ok ? "" : " · upgrade required"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} ready={ready} />
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {platform.capabilities.slice(0, 5).map((cap) => (
              <span
                key={cap.capability}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  cap.available
                    ? "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-border/70 text-muted-foreground",
                )}
              >
                {CAPABILITY_LABELS[cap.capability] ?? cap.capability}
              </span>
            ))}
            {platform.capabilities.length > 5 ? (
              <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                +{platform.capabilities.length - 5}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{platform.connection?.accountCount ?? 0} accounts</span>
            <span>{availableCaps}/{platform.capabilities.length} capabilities</span>
            <span>{ready ? "Credentials saved" : "Credentials incomplete"}</span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function PlatformDetail({
  platform,
  config,
}: {
  platform?: Platform;
  config?: PublicMarketingProviderAppConfig;
}) {
  const providerId = platform?.id ?? config?.providerId ?? "";
  const ready = credentialsReady(providerId, config);
  const status = platform?.connection?.status;
  const displayName = platform?.displayName ?? PLATFORM_LABELS[providerId] ?? providerId;

  return (
    <div className="space-y-5">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <PlatformIcon platform={platform ?? { id: providerId, icon: providerId }} />
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {displayName}
                  <StatusBadge status={status} ready={ready} />
                </CardTitle>
                <CardDescription className="mt-1">
                  {platform
                    ? `API ${platform.version.apiVersion} · SDK ${platform.version.sdkVersion}${
                        platform.compatibility.ok ? " · compatible" : " · upgrade required"
                      }`
                    : "Save credentials to enable this platform."}
                </CardDescription>
              </div>
            </div>
            {ready ? (
              <Button asChild>
                <Link href={`/api/marketing/oauth/${providerId}/start`}>
                  {platform?.connection ? "Reconnect" : "Connect"} {displayName}
                </Link>
              </Button>
            ) : (
              <Button type="button" disabled>
                Save credentials first
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              icon={isConnectedStatus(status) ? CheckCircle2 : Unplug}
              label="Connection"
              value={connectionLabel(status)}
            />
            <Metric
              icon={ShieldCheck}
              label="Accounts"
              value={String(platform?.connection?.accountCount ?? 0)}
            />
            <Metric
              icon={Share2}
              label="Health"
              value={platform?.runtime?.healthSummary ?? (ready ? "Ready to connect" : "Needs setup")}
            />
          </div>
          {platform ? (
            <div className="flex flex-wrap gap-1.5">
              {platform.capabilities.map((cap) => (
                <span
                  key={cap.capability}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs",
                    cap.available
                      ? "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-border/70 text-muted-foreground",
                  )}
                  title={!cap.available && cap.reason ? cap.reason : undefined}
                >
                  {CAPABILITY_LABELS[cap.capability] ?? cap.capability}
                  {!cap.available && cap.reason ? ` · ${cap.reason}` : ""}
                </span>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <MarketingProviderCredentialsForms
        configs={config ? [config] : []}
        providerId={providerId}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function MarketingPlatformsPanel({
  platforms,
  appConfigs,
  error,
  connected,
}: {
  platforms: Platform[];
  appConfigs: PublicMarketingProviderAppConfig[];
  error?: string;
  connected?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const providerTabs = useMemo(() => {
    const ids = platforms.length
      ? platforms.map((p) => p.id)
      : appConfigs.map((c) => c.providerId);
    return ids.map((id) => {
      const platform = platforms.find((p) => p.id === id);
      const config = appConfigs.find((c) => c.providerId === id);
      return {
        id,
        label: platform?.displayName ?? PLATFORM_LABELS[id] ?? id,
        status: platformTabStatus(platform, config, id),
      } satisfies SettingsRibbonTab;
    });
  }, [platforms, appConfigs]);

  const tabs: SettingsRibbonTab[] = useMemo(
    () => [{ id: "overview", label: "Overview" }, ...providerTabs],
    [providerTabs],
  );

  const validTabIds = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);

  const activeTab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    const providerParam = searchParams.get("provider");
    if (tabParam && validTabIds.has(tabParam)) return tabParam;
    if (providerParam && validTabIds.has(providerParam)) return providerParam;
    return "overview";
  }, [searchParams, validTabIds]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    if (tabId === "overview") params.delete("provider");
    else params.set("provider", tabId);
    router.replace(`/admin/marketing/platforms?${params.toString()}`, { scroll: false });
  };

  const connectedCount = platforms.filter((p) => isConnectedStatus(p.connection?.status)).length;
  const setupCount = platforms.filter(
    (p) => !credentialsReady(p.id, appConfigs.find((c) => c.providerId === p.id)),
  ).length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        className="mb-0"
        title="Social Platforms"
        description="Save provider app credentials, then connect Meta and LinkedIn accounts. Secrets are encrypted at rest."
      />

      {error ? (
        <div
          className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{formatConnectionError(error)}</p>
        </div>
      ) : null}
      {connected ? (
        <div
          className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Connected provider: {PLATFORM_LABELS[connected] ?? connected}</p>
        </div>
      ) : null}

      <AdminSettingsLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layoutId="marketing-platforms-ribbon"
      >
        {(tab) => {
          if (tab === "overview") {
            return (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric icon={Share2} label="Platforms" value={String(platforms.length || appConfigs.length)} />
                  <Metric icon={CheckCircle2} label="Connected" value={String(connectedCount)} />
                  <Metric icon={AlertCircle} label="Needs setup" value={String(setupCount)} />
                </div>
                {platforms.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    Platform status is unavailable. Use the tabs above to configure Meta or LinkedIn credentials.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {platforms.map((platform) => (
                      <PlatformOverviewCard
                        key={platform.id}
                        platform={platform}
                        config={appConfigs.find((c) => c.providerId === platform.id)}
                        onOpen={() => handleTabChange(platform.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <PlatformDetail
              platform={platforms.find((p) => p.id === tab)}
              config={appConfigs.find((c) => c.providerId === tab)}
            />
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}
