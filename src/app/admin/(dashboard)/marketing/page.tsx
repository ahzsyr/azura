import { marketingService } from "@/modules/marketing/service";
import { MarketingDashboardPanel } from "@/modules/marketing/admin/dashboard-panel";
import { analyticsAggregateService } from "@/modules/marketing/analytics/aggregate";
import { ensureMarketingSources } from "@/modules/marketing/sources/service";

export const dynamic = "force-dynamic";

export default async function AdminMarketingDashboardPage() {
  await ensureMarketingSources().catch(() => undefined);
  const [stats, kpis] = await Promise.all([
    marketingService.getDashboardStats(),
    analyticsAggregateService.getDashboardKpis(30).catch(() => ({
      totals: {
        visitors: 0,
        sessions: 0,
        pageViews: 0,
        leads: 0,
        conversions: 0,
        spend: 0,
        impressions: 0,
        clicks: 0,
        cpl: null,
        cpc: null,
        conversionRate: null,
        costPerConversion: null,
      },
      trends: [],
      activeCampaigns: 0,
      topCampaigns: [],
      recentConversions: [],
      sources: [],
    })),
  ]);
  return <MarketingDashboardPanel kpis={kpis} integration={stats} />;
}
