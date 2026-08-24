import { campaignService } from "@/modules/marketing/campaigns/service";
import { MarketingCampaignsPanel } from "@/modules/marketing/admin/campaigns-panel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMarketingCampaignsPage() {
  const [campaigns, adAccounts] = await Promise.all([
    campaignService.list().catch(() => []),
    prisma.marketingAccount
      .findMany({
        where: { accountType: { contains: "ad" } },
        include: { connection: true },
        take: 100,
      })
      .catch(() => []),
  ]);

  return <MarketingCampaignsPanel campaigns={campaigns} adAccounts={adAccounts} />;
}
