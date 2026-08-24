import "server-only";
import { prisma } from "@/lib/prisma";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { findProvider } from "@/modules/marketing/core/registry";
import type { Prisma } from "@prisma/client";

export const adSyncService = {
  async listAdAccounts() {
    return prisma.marketingAccount.findMany({
      where: { accountType: { in: ["ad_account", "adAccount", "facebook_ad_account", "google_ads_customer", "linkedin_ad_account"] } },
      include: { connection: true },
      orderBy: { updatedAt: "desc" },
    });
  },

  async syncAdAccountsForConnection(connectionId: string, providerId: string) {
    bootstrapMarketingModule();
    const adapter = findProvider(providerId);
    if (!adapter?.listAdAccounts) {
      throw new Error(`Provider ${providerId} does not support listAdAccounts`);
    }
    const accounts = await adapter.listAdAccounts(connectionId);
    const results = [];
    for (const account of accounts) {
      const row = await prisma.marketingAccount.upsert({
        where: {
          connectionId_externalAccountId: {
            connectionId,
            externalAccountId: account.externalId,
          },
        },
        create: {
          connectionId,
          externalAccountId: account.externalId,
          accountType: "ad_account",
          displayName: account.name,
          currency: account.currency ?? null,
          metadata: (account.metadata ?? {}) as Prisma.InputJsonValue,
          lastSyncAt: new Date(),
        },
        update: {
          displayName: account.name,
          currency: account.currency ?? null,
          accountType: "ad_account",
          metadata: (account.metadata ?? {}) as Prisma.InputJsonValue,
          lastSyncAt: new Date(),
        },
      });
      results.push(row);
    }
    return results;
  },

  async syncCampaignsForAdAccount(connectionId: string, providerId: string, adAccountId: string) {
    bootstrapMarketingModule();
    const adapter = findProvider(providerId);
    if (!adapter?.syncExternalCampaigns) {
      throw new Error(`Provider ${providerId} does not support syncExternalCampaigns`);
    }
    const adAccount = await prisma.marketingAccount.findUnique({ where: { id: adAccountId } });
    if (!adAccount) throw new Error("Ad account not found");

    const campaigns = await adapter.syncExternalCampaigns(
      connectionId,
      adAccount.externalAccountId,
    );

    const results = [];
    for (const campaign of campaigns) {
      const row = await prisma.marketingExternalCampaign.upsert({
        where: {
          providerId_externalId: { providerId, externalId: campaign.externalId },
        },
        create: {
          providerId,
          externalId: campaign.externalId,
          name: campaign.name,
          status: campaign.status ?? "unknown",
          providerEntityType: campaign.providerEntityType ?? "campaign",
          adAccountId,
          providerMetadata: (campaign.metadata ?? {}) as Prisma.InputJsonValue,
        },
        update: {
          name: campaign.name,
          status: campaign.status ?? "unknown",
          providerEntityType: campaign.providerEntityType ?? "campaign",
          adAccountId,
          providerMetadata: (campaign.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      results.push(row);

      if (adapter.syncAdGroups) {
        const groups = await adapter.syncAdGroups(connectionId, campaign.externalId);
        for (const group of groups) {
          const adGroup = await prisma.marketingAdGroup.upsert({
            where: {
              providerId_externalId: { providerId, externalId: group.externalId },
            },
            create: {
              providerId,
              externalId: group.externalId,
              name: group.name,
              status: group.status ?? "unknown",
              providerEntityType: group.providerEntityType ?? "ad_group",
              externalCampaignId: row.id,
              providerMetadata: (group.metadata ?? {}) as Prisma.InputJsonValue,
            },
            update: {
              name: group.name,
              status: group.status ?? "unknown",
              providerEntityType: group.providerEntityType ?? "ad_group",
              externalCampaignId: row.id,
              providerMetadata: (group.metadata ?? {}) as Prisma.InputJsonValue,
            },
          });

          if (adapter.syncAds) {
            const ads = await adapter.syncAds(connectionId, group.externalId);
            for (const ad of ads) {
              const adRow = await prisma.marketingAd.upsert({
                where: {
                  providerId_externalId: { providerId, externalId: ad.externalId },
                },
                create: {
                  providerId,
                  externalId: ad.externalId,
                  name: ad.name,
                  status: ad.status ?? "unknown",
                  providerEntityType: ad.providerEntityType ?? "ad",
                  adGroupId: adGroup.id,
                  providerMetadata: (ad.metadata ?? {}) as Prisma.InputJsonValue,
                },
                update: {
                  name: ad.name,
                  status: ad.status ?? "unknown",
                  adGroupId: adGroup.id,
                  providerMetadata: (ad.metadata ?? {}) as Prisma.InputJsonValue,
                },
              });

              if (adapter.syncCreatives) {
                const creatives = await adapter.syncCreatives(connectionId, ad.externalId);
                for (const creative of creatives) {
                  await prisma.marketingCreative.upsert({
                    where: {
                      providerId_externalId: { providerId, externalId: creative.externalId },
                    },
                    create: {
                      providerId,
                      externalId: creative.externalId,
                      name: creative.name ?? null,
                      creativeType: creative.creativeType ?? null,
                      headline: creative.headline ?? null,
                      body: creative.body ?? null,
                      previewUrl: creative.previewUrl ?? null,
                      adId: adRow.id,
                      providerMetadata: (creative.metadata ?? {}) as Prisma.InputJsonValue,
                    },
                    update: {
                      name: creative.name ?? null,
                      creativeType: creative.creativeType ?? null,
                      headline: creative.headline ?? null,
                      body: creative.body ?? null,
                      previewUrl: creative.previewUrl ?? null,
                      adId: adRow.id,
                      providerMetadata: (creative.metadata ?? {}) as Prisma.InputJsonValue,
                    },
                  });
                }
              }
            }
          }
        }
      }
    }

    await prisma.marketingAccount.update({
      where: { id: adAccountId },
      data: { lastSyncAt: new Date() },
    });

    return results;
  },

  async syncMetrics(
    connectionId: string,
    providerId: string,
    externalCampaignId: string,
    period: { from: string; to: string },
  ) {
    bootstrapMarketingModule();
    const adapter = findProvider(providerId);
    if (!adapter?.fetchCampaignMetrics) {
      throw new Error(`Provider ${providerId} does not support fetchCampaignMetrics`);
    }
    const metrics = await adapter.fetchCampaignMetrics(connectionId, externalCampaignId, period);
    for (const metric of metrics) {
      await prisma.marketingAnalyticsSnapshot.create({
        data: {
          providerId,
          accountId: metric.accountId ?? externalCampaignId,
          metric: "impressions",
          value: metric.impressions,
          periodStart: new Date(metric.periodStart),
          periodEnd: new Date(metric.periodEnd),
          dimensions: {
            externalCampaignId,
            clicks: String(metric.clicks),
            spend: String(metric.spend),
            conversions: String(metric.conversions),
          },
        },
      }).catch(async () => {
        // Unique constraint may collide; upsert via updateMany not available on composite — ignore duplicates
      });
    }
    return metrics;
  },
};
