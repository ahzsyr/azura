import { marketingService } from "@/modules/marketing/service";
import { MarketingPlatformsPanel } from "@/modules/marketing/admin/platforms-panel";
import { listPublicProviderAppConfigs } from "@/modules/marketing/providers/app-config";

export const dynamic = "force-dynamic";

export default async function AdminMarketingPlatformsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; connected?: string; provider?: string }>;
}) {
  const platforms = await marketingService.listPlatformOverview();
  const appConfigs = await listPublicProviderAppConfigs(["meta", "linkedin"]);
  const params = (await searchParams) ?? {};
  return (
    <MarketingPlatformsPanel
      platforms={platforms}
      appConfigs={appConfigs}
      error={params.error}
      connected={params.connected ? params.provider : undefined}
    />
  );
}
