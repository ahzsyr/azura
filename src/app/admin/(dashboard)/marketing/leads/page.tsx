import { marketingService } from "@/modules/marketing/service";
import { MarketingLeadsPanel } from "@/modules/marketing/admin/leads-panel";

export const dynamic = "force-dynamic";

export default async function AdminMarketingLeadsPage() {
  const leads = await marketingService.listLeadEvents();
  return <MarketingLeadsPanel leads={leads} />;
}
