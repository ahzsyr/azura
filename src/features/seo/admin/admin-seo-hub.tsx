"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Activity,
  Bot,
  Braces,
  FileText,
  LineChart,
  Route,
  Search,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { StaticPagesSeoPanel } from "@/features/seo/admin/static-pages-seo-panel";
import type { PageSeoContext } from "@/features/seo/page-seo-context.types";

export const ADMIN_SEO_TABS = [
  { id: "overview", label: "Overview" },
  { id: "tools", label: "Global tools" },
  { id: "health", label: "Integrations & health" },
  { id: "pages", label: "Static pages" },
] as const;

export type AdminSeoTabId = (typeof ADMIN_SEO_TABS)[number]["id"];

type Props = {
  contextsByKey: Record<string, PageSeoContext>;
  cmsCount: number;
  postCount: number;
  integrationHealth: Array<{
    provider: string;
    enabled: boolean;
    configured: boolean;
    ok: boolean;
    message: string;
  }>;
  submissionMetrics: {
    pending: number;
    failed: number;
    completed: number;
    running: number;
    exhausted: number;
    failedLast24h: number;
    stuck: number;
    providerStats: Array<{
      provider: string;
      completed: number;
      failed: number;
      exhausted: number;
      total: number;
      successRate: number;
    }>;
  };
  providerTelemetry: Array<{
    provider: string;
    successRate: number;
    p95LatencyMs: number;
    failures: number;
    volume: number;
  }>;
  searchReport: {
    totalClicks: number;
    totalImpressions: number;
    topPages: Array<{ key: string; clicks: number }>;
    topQueries: Array<{ key: string; clicks: number }>;
  };
};

function isValidTab(id: string | null): id is AdminSeoTabId {
  return ADMIN_SEO_TABS.some((t) => t.id === id);
}

const TOOL_LINKS = [
  {
    href: "/admin/seo/autofill",
    icon: FileText,
    title: "Auto-fill",
    description: "Single and bulk metadata generation from content snapshots",
  },
  {
    href: "/admin/seo/audit",
    icon: Search,
    title: "SEO audit",
    description: "Score and fix issues across pages",
  },
  {
    href: "/admin/seo/redirects",
    icon: Route,
    title: "Redirects",
    description: "301/302 URL rules",
  },
  {
    href: "/admin/seo/robots",
    icon: Bot,
    title: "Robots.txt",
    description: "Allow / disallow crawl paths",
  },
  {
    href: "/admin/seo/structured-data",
    icon: Braces,
    title: "Structured data",
    description: "Global JSON-LD schemas",
  },
  {
    href: "/admin/seo/google",
    icon: LineChart,
    title: "Google",
    description: "Analytics, Tag Manager, Search Console, and API status",
  },
  {
    href: "/admin/seo/integrations",
    icon: Activity,
    title: "Integrations",
    description: "Bing, IndexNow, queue health, and monitoring",
  },
  {
    href: "/admin/seo/404",
    icon: AlertCircle,
    title: "404 pages",
    description: "EN / AR not-found copy",
  },
] as const;

export function AdminSeoHub({
  contextsByKey,
  cmsCount,
  postCount,
  integrationHealth,
  submissionMetrics,
  providerTelemetry,
  searchReport,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<AdminSeoTabId>(() =>
    isValidTab(tabParam) ? tabParam : "overview",
  );

  useEffect(() => {
    if (isValidTab(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    if (!isValidTab(tabId)) return;
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    if (tabId !== "pages") {
      params.delete("page");
    }
    router.replace(`/admin/seo/metadata?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="SEO Dashboard"
        description="Per-page meta, Open Graph, Twitter cards, JSON-LD, robots, and global tools."
      />

      <AdminSettingsLayout
        tabs={[...ADMIN_SEO_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {(tab) => {
          if (tab === "overview") {
            return (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        CMS pages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">{cmsCount}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Published</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Blog posts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">{postCount}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Published</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Static routes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">{STATIC_SEO_PAGES.length}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Marketing pages</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" aria-hidden />
                      Dynamic content
                    </CardTitle>
                    <CardDescription>
                      SEO for CMS pages, blog posts, and packages is edited on each entity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">{cmsCount}</span> published CMS
                      pages — open any page under{" "}
                      <Link href="/admin/pages" className="text-primary hover:underline">
                        Pages
                      </Link>
                      .
                    </p>
                    <p>
                      <span className="font-medium text-foreground">{postCount}</span> published
                      blog posts — edit SEO on each post in{" "}
                      <Link href="/admin/posts" className="text-primary hover:underline">
                        Blog
                      </Link>
                      .
                    </p>
                    <p>Packages — SEO fields on the package editor when available.</p>
                  </CardContent>
                </Card>
              </div>
            );
          }

          if (tab === "tools") {
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TOOL_LINKS.map((tool) => (
                  <Link key={tool.href} href={tool.href}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader className="pb-2">
                        <tool.icon className="h-5 w-5 text-primary" aria-hidden />
                        <CardTitle className="text-base">{tool.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {tool.description}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            );
          }

          if (tab === "health") {
            return (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-7">
                  {[
                    ["Pending", submissionMetrics.pending],
                    ["Running", submissionMetrics.running],
                    ["Failed", submissionMetrics.failed],
                    ["Exhausted", submissionMetrics.exhausted],
                    ["Completed", submissionMetrics.completed],
                    ["Failed 24h", submissionMetrics.failedLast24h],
                    ["Stuck", submissionMetrics.stuck],
                  ].map(([label, value]) => (
                    <Card key={label}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold tabular-nums">{value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Provider health</CardTitle>
                    <CardDescription>
                      Status of configured search platform integrations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    {integrationHealth.map((item) => (
                      <div key={item.provider} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium capitalize">{item.provider}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              item.ok
                                ? "bg-emerald-100 text-emerald-700"
                                : item.enabled
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.enabled ? (item.configured ? "Ready" : "Setup") : "Off"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{item.message}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Provider success rates</CardTitle>
                    <CardDescription>
                      Completed vs failed and exhausted jobs, grouped by provider.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    {submissionMetrics.providerStats.map((provider) => (
                      <div key={provider.provider} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium capitalize">{provider.provider}</p>
                          <span className="text-lg font-semibold tabular-nums">
                            {provider.successRate}%
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {provider.completed} completed · {provider.failed} failed ·{" "}
                          {provider.exhausted} exhausted
                        </p>
                      </div>
                    ))}
                    {submissionMetrics.providerStats.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No provider results yet.</p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Provider telemetry</CardTitle>
                    <CardDescription>Submission reliability and latency from recorded events.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    {providerTelemetry.map((provider) => (
                      <div key={provider.provider} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium capitalize">{provider.provider}</p>
                          <span className="text-lg font-semibold tabular-nums">
                            {provider.successRate}%
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          P95 {provider.p95LatencyMs}ms · {provider.volume} events · {provider.failures} failures
                        </p>
                      </div>
                    ))}
                    {providerTelemetry.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No telemetry events yet.</p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Search analytics</CardTitle>
                    <CardDescription>
                      {searchReport.totalClicks} clicks and {searchReport.totalImpressions} impressions imported.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Top pages</p>
                      {searchReport.topPages.slice(0, 3).map((row) => (
                        <div key={row.key} className="flex justify-between gap-3 text-sm">
                          <span className="truncate text-muted-foreground">{row.key}</span>
                          <span className="font-medium tabular-nums">{row.clicks}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Top queries</p>
                      {searchReport.topQueries.slice(0, 3).map((row) => (
                        <div key={row.key} className="flex justify-between gap-3 text-sm">
                          <span className="truncate text-muted-foreground">{row.key}</span>
                          <span className="font-medium tabular-nums">{row.clicks}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Link href="/admin/seo/google" className="text-sm text-primary hover:underline">
                  Open Google settings
                </Link>
              </div>
            );
          }

          return (
            <StaticPagesSeoPanel contextsByKey={contextsByKey} />
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}
