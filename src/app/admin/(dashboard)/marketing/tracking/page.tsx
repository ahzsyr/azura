import { marketingService } from "@/modules/marketing/service";
import { MarketingTrackingPanel } from "@/modules/marketing/admin/tracking-panel";

export const dynamic = "force-dynamic";

export default async function AdminMarketingTrackingPage() {
  let configs: Awaited<ReturnType<typeof marketingService.getTrackingConfigs>> = [];
  try {
    configs = await marketingService.getTrackingConfigs();
  } catch (error) {
    console.error("[admin/marketing/tracking] load failed:", error);
  }
  return <MarketingTrackingPanel configs={configs} />;
}
