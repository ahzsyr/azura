import { adSyncService } from "@/modules/marketing/ads/sync-service";
import { MarketingAdAccountsPanel } from "@/modules/marketing/admin/ad-accounts-panel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMarketingAdAccountsPage() {
  const accounts = await prisma.marketingAccount
    .findMany({
      where: {
        OR: [
          { accountType: { contains: "ad" } },
          { accountType: "ad_account" },
          { accountType: "google_ads_customer" },
        ],
      },
      include: { connection: true },
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => []);

  // Also surface any accounts if typed differently
  const fallback =
    accounts.length === 0
      ? await adSyncService.listAdAccounts().catch(() => [])
      : accounts;

  return <MarketingAdAccountsPanel accounts={fallback} />;
}
