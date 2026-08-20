"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SearchAnalyticsReport } from "@/capabilities/search/analytics/search-analytics.types";
import {
  DailyActivityChart,
  HorizontalBarChart,
  MetricCard,
} from "@/capabilities/search/admin/search-analytics-charts";

type Props = {
  locale: string;
  enabled: boolean;
};

export function SearchAnalyticsPanel({ locale, enabled }: Props) {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<SearchAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/search/analytics?locale=${encodeURIComponent(locale)}&days=${days}`
      );
      if (!res.ok) throw new Error("Failed to load analytics");
      setReport((await res.json()) as SearchAnalyticsReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [locale, days]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  if (!enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
          <CardDescription>
            Enable analytics hooks above to start recording searches, clicks, and filters.
            Data is stored in the <code className="text-xs">SearchAnalyticsSnapshot</code> database table (cloud) or locally under <code className="text-xs">data/search-analytics/</code> in dev.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
            >
              {d} days
            </Button>
          ))}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ms-2">Refresh</span>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading && !report ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading reports…
        </div>
      ) : report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total searches" value={report.totals.searches} />
            <MetricCard
              label="Click-through rate"
              value={`${report.totals.clickThroughRate}%`}
              hint={`${report.totals.clicks} result clicks`}
            />
            <MetricCard
              label="Conversion rate"
              value={`${report.totals.conversionRate}%`}
              hint={`${report.totals.conversions} navigations from search`}
            />
            <MetricCard
              label="Zero-result rate"
              value={`${report.totals.zeroResultRate}%`}
              hint={`${report.totals.zeroResults} empty result sets`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity over time</CardTitle>
              <CardDescription>Daily searches, clicks, and no-result queries</CardDescription>
            </CardHeader>
            <CardContent>
              <DailyActivityChart series={report.dailySeries} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most searched terms</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  items={report.topSearchTerms.map((t) => ({
                    label: t.term,
                    count: t.count,
                  }))}
                  labelKey="label"
                  valueKey="count"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">No-result searches</CardTitle>
                <CardDescription>Queries that returned zero hits</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  items={report.noResultSearches.map((t) => ({
                    label: t.term,
                    count: t.count,
                  }))}
                  labelKey="label"
                  valueKey="count"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Popular content</CardTitle>
                <CardDescription>Most clicked search results</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  items={report.popularContent.map((c) => ({
                    label: c.title,
                    count: c.clicks,
                  }))}
                  labelKey="label"
                  valueKey="count"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top filters used</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  items={report.topFilters.map((f) => ({
                    label: f.label,
                    count: f.count,
                  }))}
                  labelKey="label"
                  valueKey="count"
                />
              </CardContent>
            </Card>
          </div>

          {report.popularContent.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search conversions</CardTitle>
                <CardDescription>Results opened from search (by title)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-start text-xs text-muted-foreground">
                        <th className="pb-2 pe-4 font-medium">Content</th>
                        <th className="pb-2 pe-4 font-medium">Type</th>
                        <th className="pb-2 pe-4 text-end font-medium">Clicks</th>
                        <th className="pb-2 text-end font-medium">Conversions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.popularContent.map((row) => (
                        <tr key={row.key} className="border-b border-border/50">
                          <td className="max-w-[240px] truncate py-2 pe-4" title={row.title}>
                            {row.title}
                          </td>
                          <td className="py-2 pe-4 text-muted-foreground">{row.entityType}</td>
                          <td className="py-2 pe-4 text-end tabular-nums">{row.clicks}</td>
                          <td className="py-2 text-end tabular-nums">{row.conversions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Report generated {new Date(report.generatedAt).toLocaleString()} · locale{" "}
            <code>{report.locale}</code>
          </p>
        </>
      ) : null}
    </div>
  );
}
