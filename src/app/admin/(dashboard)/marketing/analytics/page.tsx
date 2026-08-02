import { marketingService } from "@/modules/marketing/service";
import { MarketingAnalyticsPanel } from "@/modules/marketing/admin/analytics-panel";

export const dynamic = "force-dynamic";

export default async function AdminMarketingAnalyticsPage() {
  const rows = await marketingService.listAnalytics();
  return <MarketingAnalyticsPanel rows={rows} />;
}
