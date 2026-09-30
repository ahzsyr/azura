"use client";

import Link from "next/link";
import type {
  PublicSeoIntegrationProviderConfig,
  SeoProviderHealth,
  SeoTrackingConfig,
} from "@/features/seo/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  isGa4AnalyticsReady,
  isGscSearchAnalyticsReady,
  isGscSitemapReady,
} from "./google-integration-readiness";
import {
  isGtagSiteTrackingConfigured,
  isGtmSiteTrackingConfigured,
  isTrackingConfigured,
  normalizeGtmContainerId,
  normalizeMeasurementId,
} from "@/features/seo/tracking/resolve-tracking";

type ServiceStatus = "active" | "setup" | "disabled" | "inactive";

function statusBadge(status: ServiceStatus, detail?: string) {
  const variants: Record<ServiceStatus, string> = {
    active: "bg-emerald-600 text-white border-transparent",
    setup: "bg-amber-500 text-white border-transparent",
    disabled: "",
    inactive: "",
  };
  const labels: Record<ServiceStatus, string> = {
    active: "Active",
    setup: "Setup needed",
    disabled: "Disabled",
    inactive: "Not configured",
  };
  return (
    <Badge variant={status === "disabled" || status === "inactive" ? "outline" : undefined} className={variants[status]}>
      {detail ?? labels[status]}
    </Badge>
  );
}

function ga4SiteStatus(config: SeoTrackingConfig, envFallbackGaId?: string): ServiceStatus {
  if (isGtagSiteTrackingConfigured(config)) return "active";
  if (normalizeMeasurementId(config.measurementId ?? "")) return "setup";
  if (envFallbackGaId && config.enabled !== true && !isGtmSiteTrackingConfigured(config)) {
    return "active";
  }
  return "inactive";
}

function gtmSiteStatus(config: SeoTrackingConfig): ServiceStatus {
  if (isGtmSiteTrackingConfigured(config)) return "active";
  if (normalizeGtmContainerId(config.gtmContainerId ?? "")) return "setup";
  return "inactive";
}

function gscStatus(
  google: PublicSeoIntegrationProviderConfig,
  googleHealth?: SeoProviderHealth,
): ServiceStatus {
  if (!google.enabled) return "disabled";
  if (!isGscSitemapReady(google)) return "setup";
  if (googleHealth && !googleHealth.ok) return "setup";
  return "active";
}

function analyticsApiStatus(google: PublicSeoIntegrationProviderConfig): ServiceStatus {
  if (!google.analyticsEnabled) return "disabled";
  const gscReady = isGscSearchAnalyticsReady(google);
  const ga4Ready = isGa4AnalyticsReady(google);
  if (gscReady && ga4Ready) return "active";
  if (gscReady || ga4Ready) return "setup";
  return "setup";
}

type GoogleServicesOverviewProps = {
  trackingConfig: SeoTrackingConfig;
  google: PublicSeoIntegrationProviderConfig;
  health: SeoProviderHealth[];
  envFallbackGaId?: string;
  onNavigateTab: (tabId: string) => void;
};

export function GoogleServicesOverview({
  trackingConfig,
  google,
  health,
  envFallbackGaId,
  onNavigateTab,
}: GoogleServicesOverviewProps) {
  const googleHealth = health.find((item) => item.provider === "google");
  const savedSiteTracking = isTrackingConfigured(trackingConfig);

  const services = [
    {
      id: "analytics",
      title: "Google Analytics",
      description: "GA4 measurement tag (gtag.js) on the public marketing site.",
      status: ga4SiteStatus(trackingConfig, envFallbackGaId),
      detail:
        ga4SiteStatus(trackingConfig, envFallbackGaId) === "active"
          ? trackingConfig.measurementId ?? envFallbackGaId
          : undefined,
      tab: "analytics",
    },
    {
      id: "tag-manager",
      title: "Google Tag Manager",
      description: "GTM container installed on locale marketing pages.",
      status: gtmSiteStatus(trackingConfig),
      detail:
        gtmSiteStatus(trackingConfig) === "active"
          ? trackingConfig.gtmContainerId ?? undefined
          : normalizeGtmContainerId(trackingConfig.gtmContainerId ?? "")
            ? trackingConfig.gtmContainerId ?? undefined
            : undefined,
      tab: "tag-manager",
    },
    {
      id: "search-console",
      title: "Search Console",
      description: "OAuth connection, sitemap submission, and GSC search performance import.",
      status: gscStatus(google, googleHealth),
      detail: googleHealth?.message,
      tab: "search-console",
    },
    {
      id: "analytics-api",
      title: "Analytics API",
      description: "GA4 property ingestion for admin search analytics dashboards.",
      status: analyticsApiStatus(google),
      detail: google.ga4PropertyId ? `Property ${google.ga4PropertyId}` : undefined,
      tab: "search-console",
    },
  ] as const;

  const activeCount = services.filter((s) => s.status === "active").length;
  const setupCount = services.filter((s) => s.status === "setup").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Google integration summary</CardTitle>
          <CardDescription>
            {activeCount} active · {setupCount} need setup ·{" "}
            {savedSiteTracking ? "Site tracking saved" : "No site tracking saved"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => onNavigateTab(service.tab)}
              className={cn(
                "rounded-xl border p-4 text-start transition-colors hover:bg-muted/40",
                service.status === "setup" && "border-amber-500/40",
                service.status === "active" && "border-emerald-500/30",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{service.title}</p>
                {statusBadge(service.status, service.status === "active" ? service.detail : undefined)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{service.description}</p>
              {service.status === "setup" && service.detail ? (
                <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{service.detail}</p>
              ) : null}
              {service.status === "active" && service.id === "search-console" && service.detail ? (
                <p className="mt-2 text-xs text-muted-foreground">{service.detail}</p>
              ) : null}
            </button>
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Bing, IndexNow, and the outbound SEO queue are in{" "}
        <Link href="/admin/seo/integrations" className="text-primary underline">
          SEO integrations
        </Link>
        .
      </p>
    </div>
  );
}
