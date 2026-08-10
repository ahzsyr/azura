import { marketingService } from "@/modules/marketing/service";
import { MarketingDashboardPanel } from "@/modules/marketing/admin/dashboard-panel";

export const dynamic = "force-dynamic";

export default async function AdminMarketingDashboardPage() {
  const stats = await marketingService.getDashboardStats();
  return <MarketingDashboardPanel stats={stats} />;
}
