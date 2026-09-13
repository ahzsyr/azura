import { Suspense } from "react";
import { marketingService } from "@/modules/marketing/service";
import { MarketingTrackingPanel } from "@/modules/marketing/admin/tracking-panel";
import { getServerAppOrigin } from "@/lib/oauth-redirect-origin";

export const dynamic = "force-dynamic";

export default async function AdminMarketingTrackingPage() {
  let configs: Awaited<ReturnType<typeof marketingService.getTrackingConfigs>> = [];
  try {
    configs = await marketingService.getTrackingConfigs();
  } catch (error) {
    console.error("[admin/marketing/tracking] load failed:", error);
  }

  const siteUrl = (await getServerAppOrigin()).replace(/\/$/, "");

  return (
    <Suspense>
      <MarketingTrackingPanel configs={configs} siteUrl={siteUrl} />
    </Suspense>
  );
}
