import "server-only";
import { prisma } from "@/lib/prisma";
import { enqueueMarketingJob } from "@/modules/marketing/jobs";
import { GOOGLE_ADS_PROVIDER_ID } from "@/modules/marketing/providers/google-ads/manifest";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ensure binding-aware Google Ads jobs are scheduled:
 * - campaign_sync ~6h per Google ad account
 * - ad_metrics_sync daily per linked binding
 * - token_refresh when access token nears expiry
 */
export async function scheduleGoogleAdsSyncJobs() {
  const accounts = await prisma.marketingAccount.findMany({
    where: {
      accountType: "google_ads_customer",
      connection: { providerId: GOOGLE_ADS_PROVIDER_ID },
    },
    include: { connection: true },
  });

  const now = Date.now();
  for (const account of accounts) {
    const last = account.lastSyncAt?.getTime() ?? 0;
    if (now - last >= SIX_HOURS_MS - 60_000) {
      await enqueueMarketingJob({
        jobType: "campaign_sync",
        idempotencyKey: `campaign_sync:${GOOGLE_ADS_PROVIDER_ID}:${account.id}:${Math.floor(now / SIX_HOURS_MS)}`,
        providerId: GOOGLE_ADS_PROVIDER_ID,
        connectionId: account.connectionId,
        accountId: account.id,
        scheduledAt: new Date(),
      }).catch(() => undefined);
    }
  }

  const bindings = await prisma.marketingCampaignProviderBinding.findMany({
    where: { providerId: GOOGLE_ADS_PROVIDER_ID, status: "linked" },
    include: { adAccount: true },
  });

  for (const binding of bindings) {
    if (!binding.adAccount || !binding.externalCampaignId) continue;
    const last = binding.lastMetricsSyncAt?.getTime() ?? 0;
    if (now - last >= ONE_DAY_MS - 60_000) {
      await enqueueMarketingJob({
        jobType: "ad_metrics_sync",
        idempotencyKey: `ad_metrics_sync:${binding.id}:${Math.floor(now / ONE_DAY_MS)}`,
        providerId: GOOGLE_ADS_PROVIDER_ID,
        connectionId: binding.adAccount.connectionId,
        accountId: binding.adAccountId ?? undefined,
        payload: {
          externalCampaignId: binding.externalCampaignId,
          bindingId: binding.id,
          from: new Date(now - 7 * ONE_DAY_MS).toISOString(),
          to: new Date().toISOString(),
        },
        scheduledAt: new Date(),
      }).catch(() => undefined);
    }
  }

  const connections = await prisma.marketingConnection.findMany({
    where: { providerId: GOOGLE_ADS_PROVIDER_ID },
    include: { credential: true },
  });
  for (const connection of connections) {
    const expiresAt = connection.credential?.expiresAt?.getTime();
    if (expiresAt != null && expiresAt - now < 30 * 60 * 1000) {
      await enqueueMarketingJob({
        jobType: "token_refresh",
        idempotencyKey: `token_refresh:${connection.id}:${Math.floor(now / (30 * 60 * 1000))}`,
        providerId: GOOGLE_ADS_PROVIDER_ID,
        connectionId: connection.id,
        scheduledAt: new Date(),
      }).catch(() => undefined);
    }
  }

  return {
    accounts: accounts.length,
    bindings: bindings.length,
    connections: connections.length,
  };
}
