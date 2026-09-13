import "server-only";
import { prisma } from "@/lib/prisma";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { findProvider } from "@/modules/marketing/core/registry";
import type { Prisma } from "@prisma/client";
import { GOOGLE_ADS_PROVIDER_ID } from "@/modules/marketing/providers/google-ads/manifest";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function dayBounds(daysAgo: number, daysSpan: number) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - daysSpan);
  if (daysAgo > 0) {
    // unused; kept for clarity
  }
  return {
    from: start.toISOString(),
    to: new Date(end.getTime() - 1).toISOString(),
  };
}

async function resolveBindingForExternal(
  providerId: string,
  externalCampaignId: string,
) {
  return prisma.marketingCampaignProviderBinding.findFirst({
    where: {
      providerId,
      externalCampaignId,
      status: "linked",
    },
  });
}

export const adSyncService = {
  async listAdAccounts() {
    return prisma.marketingAccount.findMany({
      where: {
        accountType: {
          in: [
            "ad_account",
            "adAccount",
            "facebook_ad_account",
            "google_ads_customer",
            "linkedin_ad_account",
          ],
        },
      },
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
      const accountType =
        providerId === GOOGLE_ADS_PROVIDER_ID
          ? "google_ads_customer"
          : providerId === "linkedin"
            ? "linkedin_ad_account"
            : providerId === "meta"
              ? "facebook_ad_account"
              : "ad_account";
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
          accountType,
          displayName: account.name,
          currency: account.currency ?? null,
          metadata: (account.metadata ?? {}) as Prisma.InputJsonValue,
          lastSyncAt: new Date(),
        },
        update: {
          displayName: account.name,
          currency: account.currency ?? null,
          accountType,
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
      const binding = await resolveBindingForExternal(providerId, campaign.externalId);
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
          providerBindingId: binding?.id ?? null,
          providerMetadata: (campaign.metadata ?? {}) as Prisma.InputJsonValue,
        },
        update: {
          name: campaign.name,
          status: campaign.status ?? "unknown",
          providerEntityType: campaign.providerEntityType ?? "campaign",
          adAccountId,
          providerBindingId: binding?.id ?? null,
          providerMetadata: (campaign.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      results.push(row);

      const customerOpts = { customerId: adAccount.externalAccountId };

      if (adapter.syncAdGroups) {
        const groups = await adapter.syncAdGroups(
          connectionId,
          campaign.externalId,
          customerOpts,
        );
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
            const ads = await adapter.syncAds(connectionId, group.externalId, customerOpts);
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

    // Suggested matches after inventory sync (Google Ads)
    if (providerId === GOOGLE_ADS_PROVIDER_ID) {
      const { applyGoogleCampaignMatches } = await import(
        "@/modules/marketing/campaigns/match-google"
      );
      await applyGoogleCampaignMatches({ adAccountId }).catch(() => undefined);
    }

    return results;
  },

  /**
   * Sync a single bound Google (or other) campaign: details, ad groups, ads, 7d+30d metrics.
   */
  async syncBoundCampaign(bindingId: string) {
    bootstrapMarketingModule();
    const binding = await prisma.marketingCampaignProviderBinding.findUnique({
      where: { id: bindingId },
      include: {
        adAccount: { include: { connection: true } },
        campaign: true,
      },
    });
    if (!binding) throw new Error("Binding not found");
    if (!binding.externalCampaignId) throw new Error("Binding has no external campaign id");
    if (!binding.adAccount) throw new Error("Binding has no ad account");

    const connectionId = binding.adAccount.connectionId;
    const providerId = binding.providerId;
    const adapter = findProvider(providerId);
    if (!adapter) throw new Error(`Provider ${providerId} not registered`);

    const customerId = binding.adAccount.externalAccountId;
    const customerOpts = { customerId };

    try {
      await prisma.marketingCampaignProviderBinding.update({
        where: { id: bindingId },
        data: { syncStatus: "running", lastSyncError: null },
      });

      // Refresh campaign list row for this external id
      let external = await prisma.marketingExternalCampaign.findUnique({
        where: {
          providerId_externalId: {
            providerId,
            externalId: binding.externalCampaignId,
          },
        },
      });

      if (adapter.syncExternalCampaigns) {
        const campaigns = await adapter.syncExternalCampaigns(connectionId, customerId);
        const match = campaigns.find((c) => c.externalId === binding.externalCampaignId);
        if (match) {
          external = await prisma.marketingExternalCampaign.upsert({
            where: {
              providerId_externalId: { providerId, externalId: match.externalId },
            },
            create: {
              providerId,
              externalId: match.externalId,
              name: match.name,
              status: match.status ?? "unknown",
              providerEntityType: match.providerEntityType ?? "campaign",
              adAccountId: binding.adAccountId,
              providerBindingId: binding.id,
              providerMetadata: (match.metadata ?? {}) as Prisma.InputJsonValue,
            },
            update: {
              name: match.name,
              status: match.status ?? "unknown",
              adAccountId: binding.adAccountId,
              providerBindingId: binding.id,
              providerMetadata: (match.metadata ?? {}) as Prisma.InputJsonValue,
            },
          });

          await prisma.marketingCampaignProviderBinding.update({
            where: { id: bindingId },
            data: {
              externalCampaignName: match.name,
              providerMetadata: asJson({
                ...((binding.providerMetadata as Record<string, unknown>) ?? {}),
                status: match.status,
                channelType: match.metadata?.channelType,
                channelSubType: match.metadata?.channelSubType,
              }),
            },
          });
        }
      }

      if (!external) {
        external = await prisma.marketingExternalCampaign.create({
          data: {
            providerId,
            externalId: binding.externalCampaignId,
            name: binding.externalCampaignName ?? binding.externalCampaignId,
            status: "unknown",
            adAccountId: binding.adAccountId,
            providerBindingId: binding.id,
          },
        });
      } else if (external.providerBindingId !== binding.id) {
        await prisma.marketingExternalCampaign.update({
          where: { id: external.id },
          data: { providerBindingId: binding.id },
        });
      }

      if (adapter.syncAdGroups) {
        const groups = await adapter.syncAdGroups(
          connectionId,
          binding.externalCampaignId,
          customerOpts,
        );
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
              externalCampaignId: external.id,
              providerMetadata: (group.metadata ?? {}) as Prisma.InputJsonValue,
            },
            update: {
              name: group.name,
              status: group.status ?? "unknown",
              externalCampaignId: external.id,
              providerMetadata: (group.metadata ?? {}) as Prisma.InputJsonValue,
            },
          });

          if (adapter.syncAds) {
            const ads = await adapter.syncAds(connectionId, group.externalId, customerOpts);
            for (const ad of ads) {
              await prisma.marketingAd.upsert({
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
            }
          }
        }
      }

      const period7 = dayBounds(0, 7);
      const period30 = dayBounds(0, 30);
      await this.syncMetrics(connectionId, providerId, binding.externalCampaignId, period7, {
        bindingId: binding.id,
        customerId,
      });
      await this.syncMetrics(connectionId, providerId, binding.externalCampaignId, period30, {
        bindingId: binding.id,
        customerId,
      });

      const now = new Date();
      const updated = await prisma.marketingCampaignProviderBinding.update({
        where: { id: bindingId },
        data: {
          syncStatus: "ok",
          lastSyncAt: now,
          lastMetricsSyncAt: now,
          lastSyncError: null,
        },
      });

      return { ok: true as const, binding: updated };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.marketingCampaignProviderBinding.update({
        where: { id: bindingId },
        data: {
          syncStatus: "error",
          lastSyncError: message.slice(0, 2000),
          lastSyncAt: new Date(),
        },
      });
      return { ok: false as const, error: message };
    }
  },

  async syncMetrics(
    connectionId: string,
    providerId: string,
    externalCampaignId: string,
    period: { from: string; to: string },
    options?: { bindingId?: string; customerId?: string },
  ) {
    bootstrapMarketingModule();
    const adapter = findProvider(providerId);
    if (!adapter?.fetchCampaignMetrics) {
      throw new Error(`Provider ${providerId} does not support fetchCampaignMetrics`);
    }

    const binding =
      options?.bindingId
        ? await prisma.marketingCampaignProviderBinding.findUnique({
            where: { id: options.bindingId },
          })
        : await resolveBindingForExternal(providerId, externalCampaignId);

    let customerId = options?.customerId;
    if (!customerId && binding?.adAccountId) {
      const account = await prisma.marketingAccount.findUnique({
        where: { id: binding.adAccountId },
      });
      customerId = account?.externalAccountId;
    }

    const metrics = await adapter.fetchCampaignMetrics(
      connectionId,
      externalCampaignId,
      period,
      customerId ? { customerId } : undefined,
    );

    const spend = metrics.reduce((s, m) => s + m.spend, 0);
    const impressions = metrics.reduce((s, m) => s + m.impressions, 0);
    const clicks = metrics.reduce((s, m) => s + m.clicks, 0);
    const conversions = metrics.reduce((s, m) => s + m.conversions, 0);

    for (const metric of metrics) {
      await prisma.marketingAnalyticsSnapshot
        .create({
          data: {
            providerId,
            accountId: metric.accountId ?? customerId ?? externalCampaignId,
            metric: "impressions",
            value: metric.impressions,
            periodStart: new Date(metric.periodStart),
            periodEnd: new Date(metric.periodEnd),
            dimensions: {
              externalCampaignId,
              clicks: String(metric.clicks),
              spend: String(metric.spend),
              conversions: String(metric.conversions),
              ...(binding ? { bindingId: binding.id, internalCampaignId: binding.campaignId } : {}),
            },
          },
        })
        .catch(() => undefined);
    }

    if (binding) {
      const periodStart = new Date(period.from.slice(0, 10) + "T00:00:00.000Z");
      const periodEnd = new Date(period.to.slice(0, 10) + "T23:59:59.999Z");

      // First-party counts for the same window
      const [sessions, pageViews, leads, firstPartyConversions] = await Promise.all([
        prisma.marketingTouch.findMany({
          where: {
            internalCampaignId: binding.campaignId,
            occurredAt: { gte: periodStart, lte: periodEnd },
          },
          select: { sessionId: true },
          distinct: ["sessionId"],
        }),
        prisma.marketingEvent.count({
          where: {
            internalCampaignId: binding.campaignId,
            name: { in: ["PageView", "LandingPageView"] },
            clientOccurredAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        prisma.marketingLeadAttribution.count({
          where: {
            internalCampaignId: binding.campaignId,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        prisma.marketingConversion.count({
          where: {
            internalCampaignId: binding.campaignId,
            clientOccurredAt: { gte: periodStart, lte: periodEnd },
          },
        }),
      ]);

      const rollupData = {
        visitors: sessions.length,
        sessions: sessions.length,
        pageViews,
        leads,
        conversions: firstPartyConversions,
        spend,
        impressions,
        clicks,
        metadata: asJson({
          adsConversions: conversions,
          source: "provider_metrics",
        }),
      };

      // Binding-level rollup
      const existingBinding = await prisma.marketingMetricRollup.findFirst({
        where: {
          periodStart,
          periodEnd,
          granularity: "day",
          internalCampaignId: binding.campaignId,
          providerId,
          providerBindingId: binding.id,
          sourceId: null,
          landingPagePath: null,
          conversionType: null,
          trafficType: null,
        },
      });
      if (existingBinding) {
        await prisma.marketingMetricRollup.update({
          where: { id: existingBinding.id },
          data: rollupData,
        });
      } else {
        await prisma.marketingMetricRollup
          .create({
            data: {
              periodStart,
              periodEnd,
              granularity: "day",
              internalCampaignId: binding.campaignId,
              providerId,
              providerBindingId: binding.id,
              ...rollupData,
            },
          })
          .catch(() => undefined);
      }

      // Campaign-level rollup (all bindings aggregated separately by getPerformance)
      await prisma.marketingCampaignProviderBinding.update({
        where: { id: binding.id },
        data: {
          lastMetricsSyncAt: new Date(),
          syncStatus: binding.syncStatus === "error" ? binding.syncStatus : "ok",
        },
      });
    }

    return metrics;
  },
};
