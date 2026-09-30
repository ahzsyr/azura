import { marketingService } from "@/modules/marketing/service";
import { MarketingPublishingPanel } from "@/modules/marketing/admin/publishing-panel";

export const dynamic = "force-dynamic";

export default async function AdminMarketingPublishingPage() {
  const jobs = await marketingService.listJobs();
  return <MarketingPublishingPanel jobs={jobs} />;
}
