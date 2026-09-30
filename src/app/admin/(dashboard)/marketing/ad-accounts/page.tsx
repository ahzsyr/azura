import { adSyncService } from "@/modules/marketing/ads/sync-service";
import { MarketingAdAccountsPanel } from "@/modules/marketing/admin/ad-accounts-panel";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsOperationalCredentials } from "@/features/seo/google-platform/ads-credentials";
import { ensureSeoBackedGoogleAdsConnection } from "@/modules/marketing/providers/google-ads/health";

export const dynamic = "force-dynamic";

export default async function AdminMarketingAdAccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    syncError?: string;
    syncMessage?: string;
    synced?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const seo = await getGoogleAdsOperationalCredentials().catch(() => null);
  if (seo?.oauthConnected) {
    await ensureSeoBackedGoogleAdsConnection().catch(() => null);
  }

  const accounts = await prisma.marketingAccount
    .findMany({
      where: {
        OR: [
          { accountType: { contains: "ad" } },
          { accountType: "ad_account" },
          { accountType: "google_ads_customer" },
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
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => []);

  const fallback =
    accounts.length === 0
      ? await adSyncService.listAdAccounts().catch(() => [])
      : accounts;

  const internalCampaigns = await prisma.marketingCampaign
    .findMany({
      select: { id: true, name: true, internalId: true },
      orderBy: { name: "asc" },
      take: 200,
    })
    .catch(() => []);

  return (
    <MarketingAdAccountsPanel
      accounts={fallback}
      internalCampaigns={internalCampaigns}
      googleAdsOauthConnected={Boolean(seo?.oauthConnected)}
      configuredCustomerId={seo?.customerId ?? null}
      syncMessage={params.syncMessage ?? null}
      syncError={params.syncError ?? null}
    />
  );
}
