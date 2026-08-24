import "server-only";
import { prisma } from "@/lib/prisma";

function dayBounds(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export const analyticsAggregateService = {
  async rollupDay(day: Date = new Date()) {
    const { start, end } = dayBounds(day);

    const [visitors, sessions, pageViews, conversions, leads] = await Promise.all([
      prisma.marketingVisitor.count({
        where: { lastSeenAt: { gte: start, lt: end } },
      }),
      prisma.marketingSession.count({
        where: { startedAt: { gte: start, lt: end } },
      }),
      prisma.marketingEvent.count({
        where: {
          name: { in: ["PageView", "LandingPageView"] },
          clientOccurredAt: { gte: start, lt: end },
        },
      }),
      prisma.marketingConversion.count({
        where: { clientOccurredAt: { gte: start, lt: end } },
      }),
      prisma.marketingLeadAttribution.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
    ]);

    const spendAgg = await prisma.marketingAccount.aggregate({
      _sum: { spend: true, impressions: true, clicks: true },
    });

    await prisma.marketingMetricRollup.upsert({
      where: {
        periodStart_periodEnd_granularity_internalCampaignId_sourceId_providerId_landingPagePath_conversionType_trafficType: {
          periodStart: start,
          periodEnd: end,
          granularity: "day",
          internalCampaignId: null as unknown as string,
          sourceId: null as unknown as string,
          providerId: null as unknown as string,
          landingPagePath: null as unknown as string,
          conversionType: null as unknown as string,
          trafficType: null as unknown as string,
        },
      },
      create: {
        periodStart: start,
        periodEnd: end,
        granularity: "day",
        visitors,
        sessions,
        pageViews,
        conversions,
        leads,
        spend: spendAgg._sum.spend ?? 0,
        impressions: spendAgg._sum.impressions ?? 0,
        clicks: spendAgg._sum.clicks ?? 0,
      },
      update: {
        visitors,
        sessions,
        pageViews,
        conversions,
        leads,
        spend: spendAgg._sum.spend ?? 0,
        impressions: spendAgg._sum.impressions ?? 0,
        clicks: spendAgg._sum.clicks ?? 0,
      },
    }).catch(async () => {
      // Unique index with nulls can be awkward on some DBs; fallback create if missing
      const existing = await prisma.marketingMetricRollup.findFirst({
        where: {
          periodStart: start,
          periodEnd: end,
          granularity: "day",
          internalCampaignId: null,
          sourceId: null,
          providerId: null,
          landingPagePath: null,
          conversionType: null,
          trafficType: null,
        },
      });
      if (existing) {
        await prisma.marketingMetricRollup.update({
          where: { id: existing.id },
          data: {
            visitors,
            sessions,
            pageViews,
            conversions,
            leads,
            spend: spendAgg._sum.spend ?? 0,
            impressions: spendAgg._sum.impressions ?? 0,
            clicks: spendAgg._sum.clicks ?? 0,
          },
        });
      } else {
        await prisma.marketingMetricRollup.create({
          data: {
            periodStart: start,
            periodEnd: end,
            granularity: "day",
            visitors,
            sessions,
            pageViews,
            conversions,
            leads,
            spend: spendAgg._sum.spend ?? 0,
            impressions: spendAgg._sum.impressions ?? 0,
            clicks: spendAgg._sum.clicks ?? 0,
          },
        });
      }
    });

    // Per-campaign rollups
    const campaigns = await prisma.marketingCampaign.findMany({ select: { id: true } });
    for (const campaign of campaigns) {
      const [cVisitors, cSessions, cPageViews, cConversions, cLeads] = await Promise.all([
        prisma.marketingTouch.findMany({
          where: {
            internalCampaignId: campaign.id,
            occurredAt: { gte: start, lt: end },
          },
          distinct: ["visitorId"],
          select: { visitorId: true },
        }),
        prisma.marketingTouch.findMany({
          where: {
            internalCampaignId: campaign.id,
            occurredAt: { gte: start, lt: end },
          },
          distinct: ["sessionId"],
          select: { sessionId: true },
        }),
        prisma.marketingEvent.count({
          where: {
            internalCampaignId: campaign.id,
            name: { in: ["PageView", "LandingPageView"] },
            clientOccurredAt: { gte: start, lt: end },
          },
        }),
        prisma.marketingConversion.count({
          where: {
            internalCampaignId: campaign.id,
            clientOccurredAt: { gte: start, lt: end },
          },
        }),
        prisma.marketingLeadAttribution.count({
          where: {
            internalCampaignId: campaign.id,
            createdAt: { gte: start, lt: end },
          },
        }),
      ]);

      const existing = await prisma.marketingMetricRollup.findFirst({
        where: {
          periodStart: start,
          periodEnd: end,
          granularity: "day",
          internalCampaignId: campaign.id,
          sourceId: null,
          providerId: null,
          landingPagePath: null,
          conversionType: null,
          trafficType: null,
        },
      });

      const data = {
        periodStart: start,
        periodEnd: end,
        granularity: "day" as const,
        internalCampaignId: campaign.id,
        visitors: cVisitors.length,
        sessions: cSessions.length,
        pageViews: cPageViews,
        conversions: cConversions,
        leads: cLeads,
      };

      if (existing) {
        await prisma.marketingMetricRollup.update({ where: { id: existing.id }, data });
      } else {
        await prisma.marketingMetricRollup.create({ data });
      }
    }

    return { start, end, visitors, sessions, pageViews, conversions, leads };
  },

  async getDashboardKpis(days = 30) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const rollups = await prisma.marketingMetricRollup.findMany({
      where: {
        periodStart: { gte: since },
        granularity: "day",
        internalCampaignId: null,
      },
      orderBy: { periodStart: "asc" },
    });

    const totals = rollups.reduce(
      (acc, row) => {
        acc.visitors += row.visitors;
        acc.sessions += row.sessions;
        acc.pageViews += row.pageViews;
        acc.leads += row.leads;
        acc.conversions += row.conversions;
        acc.spend += row.spend;
        acc.impressions += row.impressions;
        acc.clicks += row.clicks;
        return acc;
      },
      {
        visitors: 0,
        sessions: 0,
        pageViews: 0,
        leads: 0,
        conversions: 0,
        spend: 0,
        impressions: 0,
        clicks: 0,
      },
    );

    const cpl = totals.leads > 0 ? totals.spend / totals.leads : null;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : null;
    const conversionRate =
      totals.sessions > 0 ? totals.conversions / totals.sessions : null;
    const costPerConversion =
      totals.conversions > 0 ? totals.spend / totals.conversions : null;

    const [activeCampaigns, topCampaigns, recentConversions, sources] = await Promise.all([
      prisma.marketingCampaign.count({ where: { status: "ACTIVE" } }),
      prisma.marketingMetricRollup.findMany({
        where: {
          periodStart: { gte: since },
          granularity: "day",
          internalCampaignId: { not: null },
        },
        include: { internalCampaign: true },
        orderBy: { conversions: "desc" },
        take: 10,
      }),
      prisma.marketingConversion.findMany({
        take: 10,
        orderBy: { clientOccurredAt: "desc" },
        include: { conversionDefinition: true, internalCampaign: true, source: true },
      }),
      prisma.marketingSource.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    // Aggregate top campaigns by summing daily rows
    const campaignMap = new Map<
      string,
      { id: string; name: string; visitors: number; conversions: number; leads: number; spend: number }
    >();
    for (const row of topCampaigns) {
      if (!row.internalCampaign) continue;
      const cur = campaignMap.get(row.internalCampaignId!) ?? {
        id: row.internalCampaign.id,
        name: row.internalCampaign.name,
        visitors: 0,
        conversions: 0,
        leads: 0,
        spend: 0,
      };
      cur.visitors += row.visitors;
      cur.conversions += row.conversions;
      cur.leads += row.leads;
      cur.spend += row.spend;
      campaignMap.set(row.internalCampaignId!, cur);
    }

    return {
      totals: {
        ...totals,
        cpl,
        cpc,
        conversionRate,
        costPerConversion,
      },
      trends: rollups,
      activeCampaigns,
      topCampaigns: [...campaignMap.values()]
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, 5),
      recentConversions,
      sources,
    };
  },

  async compareCampaigns(campaignIds: string[], since: Date) {
    const rows = await prisma.marketingMetricRollup.findMany({
      where: {
        internalCampaignId: { in: campaignIds },
        periodStart: { gte: since },
        granularity: "day",
      },
      include: { internalCampaign: true },
    });

    const map = new Map<
      string,
      {
        id: string;
        name: string;
        spend: number;
        impressions: number;
        clicks: number;
        visitors: number;
        leads: number;
        conversions: number;
      }
    >();

    for (const row of rows) {
      if (!row.internalCampaignId || !row.internalCampaign) continue;
      const cur = map.get(row.internalCampaignId) ?? {
        id: row.internalCampaignId,
        name: row.internalCampaign.name,
        spend: 0,
        impressions: 0,
        clicks: 0,
        visitors: 0,
        leads: 0,
        conversions: 0,
      };
      cur.spend += row.spend;
      cur.impressions += row.impressions;
      cur.clicks += row.clicks;
      cur.visitors += row.visitors;
      cur.leads += row.leads;
      cur.conversions += row.conversions;
      map.set(row.internalCampaignId, cur);
    }

    return [...map.values()].map((c) => ({
      ...c,
      cpl: c.leads > 0 ? c.spend / c.leads : null,
      conversionRate: c.visitors > 0 ? c.conversions / c.visitors : null,
    }));
  },

  async landingPagePerformance(since: Date) {
    const events = await prisma.marketingEvent.groupBy({
      by: ["landingPagePath"],
      where: {
        landingPagePath: { not: null },
        clientOccurredAt: { gte: since },
      },
      _count: true,
    });

    const conversions = await prisma.marketingConversion.groupBy({
      by: ["landingPagePath"],
      where: {
        landingPagePath: { not: null },
        clientOccurredAt: { gte: since },
      },
      _count: true,
    });

    const conversionMap = new Map(
      conversions.map((c) => [c.landingPagePath, c._count]),
    );

    return events
      .filter((e) => e.landingPagePath)
      .map((e) => {
        const conv = conversionMap.get(e.landingPagePath) ?? 0;
        return {
          landingPagePath: e.landingPagePath!,
          events: e._count,
          conversions: conv,
          conversionRate: e._count > 0 ? conv / e._count : 0,
        };
      })
      .sort((a, b) => b.events - a.events);
  },
};
