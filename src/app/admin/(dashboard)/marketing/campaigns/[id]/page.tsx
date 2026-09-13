import { notFound } from "next/navigation";
import { campaignService } from "@/modules/marketing/campaigns/service";
import { MarketingCampaignDetailPanel } from "@/modules/marketing/admin/campaign-detail-panel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMarketingCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await campaignService.getById(id).catch(() => null);
  if (!campaign) notFound();

  const [performance, recentSessions, recentLeads, googleAccounts, bindingCards] =
    await Promise.all([
      campaignService.getPerformance(campaign.id),
      campaignService.getRecentSessions(campaign.id),
      campaignService.getRecentLeads(campaign.id),
      prisma.marketingAccount
        .findMany({
          where: {
            OR: [
              { accountType: "google_ads_customer" },
              { accountType: { contains: "ad" } },
            ],
          },
          include: {
            connection: true,
            externalCampaigns: {
              include: {
                providerBinding: {
                  include: { campaign: { select: { id: true, name: true } } },
                },
              },
              orderBy: { name: "asc" },
            },
          },
          take: 100,
        })
        .catch(() => []),
      campaignService.getBindingScorecards(campaign.id).catch(() => []),
    ]);

  return (
    <MarketingCampaignDetailPanel
      campaign={campaign}
      performance={performance}
      recentSessions={recentSessions}
      recentLeads={recentLeads}
      adAccounts={googleAccounts}
      bindingCards={bindingCards}
    />
  );
}
