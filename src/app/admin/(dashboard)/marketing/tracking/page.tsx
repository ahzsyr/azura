import { marketingService } from "@/modules/marketing/service";
import { MarketingTrackingPanel } from "@/modules/marketing/admin/tracking-panel";

export const dynamic = "force-dynamic";

export default async function AdminMarketingTrackingPage() {
  const configs = await marketingService.getTrackingConfigs();
  return <MarketingTrackingPanel configs={configs} />;
}
