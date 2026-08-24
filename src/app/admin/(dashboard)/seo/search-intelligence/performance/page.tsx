import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchIntelligenceOverview } from "@/features/search-intelligence/seo-consumer";
import { getSearchIntelligencePlatform } from "@/features/search-intelligence";

export const dynamic = "force-dynamic";

export default async function AdminPerformanceSeoPage() {
  const overview = await getSearchIntelligenceOverview();
  const platform = getSearchIntelligencePlatform({ siteOrigin: overview.siteOrigin });

  const correlations = platform.correlatePerformance(
    [
      { url: `${overview.siteOrigin}/`, lcpMs: 2800, cls: 0.05, inpMs: 180, ttfbMs: 420 },
      { url: `${overview.siteOrigin}/products`, lcpMs: 4100, cls: 0.12, inpMs: 260, ttfbMs: 510 },
    ],
    [
      { url: `${overview.siteOrigin}/`, ctr: 0.04, averagePosition: 8.2, conversions: 12 },
      { url: `${overview.siteOrigin}/products`, ctr: 0.015, averagePosition: 14.6, conversions: 3 },
    ],
  );

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Performance SEO"
        description="Correlate Core Web Vitals with CTR, ranking, and conversions."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">LCP → CTR → Ranking → Conversions</CardTitle>
          <CardDescription>Sample correlation view (wire PageSpeed connector for live data).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {correlations.map((row) => (
            <div key={row.url} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium truncate">{row.url}</p>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{row.risk}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                LCP {row.lcpMs ?? "—"}ms · CTR {row.ctr ?? "—"} · pos {row.averagePosition ?? "—"} · conv{" "}
                {row.conversions ?? "—"}
              </p>
              <p className="mt-1 text-muted-foreground">{row.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
