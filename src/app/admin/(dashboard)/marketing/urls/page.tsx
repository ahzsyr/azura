import { trackingUrlService } from "@/modules/marketing/tracking-urls/service";
import { campaignService } from "@/modules/marketing/campaigns/service";
import { MarketingUrlsPanel } from "@/modules/marketing/admin/urls-panel";

export const dynamic = "force-dynamic";

export default async function AdminMarketingUrlsPage() {
  const [urls, campaigns] = await Promise.all([
    trackingUrlService.list().catch(() => []),
    campaignService.list().catch(() => []),
  ]);
  return <MarketingUrlsPanel urls={urls} campaigns={campaigns} />;
}
