import "server-only";
import { prisma } from "@/lib/prisma";
import type { MarketingCampaignStatus, Prisma } from "@prisma/client";
import { trackingUrlService } from "@/modules/marketing/tracking-urls/service";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export type CampaignInput = {
  name: string;
  objective?: string | null;
  channel?: string | null;
  status?: MarketingCampaignStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  budget?: number | null;
  budgetCurrency?: string | null;
  targetAudience?: string | null;
  targetLocation?: string | null;
  landingPagePath?: string | null;
  conversionGoalId?: string | null;
  description?: string | null;
  notes?: string | null;
  internalId?: string;
  /** First-party tracking URL fields (auto-created on create when landingPagePath present) */
  utmSource?: string | null;
  utmMedium?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

export type CampaignPerformance = {
  pageViews: number;
  sessions: number;
  leads: number;
  qualifiedLeads: number;
  google: {
    spend: number;
    impressions: number;
    clicks: number;
    adsConversions: number;
    ctr: number;
    cpc: number;
  };
  website: {
    sessions: number;
    pageViews: number;
    leads: number;
    qualifiedLeads: number;
    firstPartyConversions: number;
  };
  joined: {
    cpl: number;
    costPerQualifiedLead: number;
  };
  googleBindingCount: number;
};

export const campaignService = {
  async list(filters?: { status?: MarketingCampaignStatus; q?: string }) {
    const where: Prisma.MarketingCampaignWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q } },
        { internalId: { contains: filters.q } },
      ];
    }
    return prisma.marketingCampaign.findMany({
      where,
      include: {
        providerBindings: {
          select: {
            id: true,
            providerId: true,
            syncStatus: true,
            lastSyncAt: true,
          },
        },
        conversionGoal: true,
        trackingUrls: { orderBy: { createdAt: "asc" }, take: 5 },
        _count: { select: { trackingUrls: true, conversions: true, leadAttributions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.marketingCampaign.findUnique({
      where: { id },
      include: {
        providerBindings: { include: { adAccount: true, externalCampaigns: true } },
        trackingUrls: { orderBy: { createdAt: "asc" } },
        conversionGoal: true,
      },
    });
  },

  async create(input: CampaignInput) {
    const base = input.internalId?.trim() || slugify(input.name) || `campaign_${Date.now()}`;
    let internalId = base;
    let attempt = 0;
    while (await prisma.marketingCampaign.findUnique({ where: { internalId } })) {
      attempt += 1;
      internalId = `${base}_${attempt}`;
    }
    const campaign = await prisma.marketingCampaign.create({
      data: {
        internalId,
        name: input.name.trim(),
        objective: input.objective ?? null,
        channel: input.channel ?? input.utmMedium ?? null,
        status: input.status ?? "DRAFT",
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        budget: input.budget ?? null,
        budgetCurrency: input.budgetCurrency ?? "USD",
        targetAudience: input.targetAudience ?? null,
        targetLocation: input.targetLocation ?? null,
        landingPagePath: input.landingPagePath ?? null,
        conversionGoalId: input.conversionGoalId ?? null,
        description: input.description ?? null,
        notes: input.notes ?? null,
      },
    });

    const landing = (input.landingPagePath ?? "").trim() || "/";
    await trackingUrlService.create({
      campaignId: campaign.id,
      baseUrl: landing,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: internalId,
      utmContent: input.utmContent ?? null,
      utmTerm: input.utmTerm ?? null,
      label: "Primary",
    });

    return campaign;
  },

  async update(id: string, input: Partial<CampaignInput>) {
    return prisma.marketingCampaign.update({
      where: { id },
      data: {
        ...(input.name != null ? { name: input.name.trim() } : {}),
        ...(input.objective !== undefined ? { objective: input.objective } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.status != null ? { status: input.status } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.budget !== undefined ? { budget: input.budget } : {}),
        ...(input.budgetCurrency !== undefined ? { budgetCurrency: input.budgetCurrency } : {}),
        ...(input.targetAudience !== undefined ? { targetAudience: input.targetAudience } : {}),
        ...(input.targetLocation !== undefined ? { targetLocation: input.targetLocation } : {}),
        ...(input.landingPagePath !== undefined ? { landingPagePath: input.landingPagePath } : {}),
        ...(input.conversionGoalId !== undefined ? { conversionGoalId: input.conversionGoalId } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
  },

  async setStatus(id: string, status: MarketingCampaignStatus) {
    return prisma.marketingCampaign.update({ where: { id }, data: { status } });
  },

  async addProviderBinding(input: {
    campaignId: string;
    providerId: string;
    adAccountId?: string | null;
    externalCampaignId?: string | null;
    externalCampaignName?: string | null;
  }) {
    return prisma.marketingCampaignProviderBinding.create({
      data: {
        campaignId: input.campaignId,
        providerId: input.providerId,
        adAccountId: input.adAccountId ?? null,
        externalCampaignId: input.externalCampaignId ?? null,
        externalCampaignName: input.externalCampaignName ?? null,
        status: "linked",
        syncStatus: "idle",
      },
    });
  },

  /**
   * Single bind path for Campaign-first and Google-first UIs.
   * Creates binding, attaches providerBindingId, tracking URL, then syncs the bound campaign.
   */
  async linkExternalCampaign(input: {
    campaignId: string;
    adAccountId: string;
    externalCampaignId: string;
    providerId?: string;
    externalCampaignName?: string | null;
    /** When true, create binding + tracking only (matcher / bulk). */
    skipSync?: boolean;
  }) {
    const providerId = input.providerId ?? "google-ads";
    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: input.campaignId },
    });
    if (!campaign) throw new Error("Internal campaign not found");

    const adAccount = await prisma.marketingAccount.findUnique({
      where: { id: input.adAccountId },
      include: { connection: true },
    });
    if (!adAccount) throw new Error("Ad account not found");
    if (adAccount.connection.providerId !== providerId) {
      throw new Error("Ad account provider mismatch");
    }

    let external = await prisma.marketingExternalCampaign.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: input.externalCampaignId,
        },
      },
    });

    // Advanced fallback: allow linking an id that has not been synced yet
    if (!external) {
      external = await prisma.marketingExternalCampaign.create({
        data: {
          providerId,
          externalId: input.externalCampaignId,
          name: input.externalCampaignName?.trim() || input.externalCampaignId,
          status: "unknown",
          adAccountId: input.adAccountId,
        },
      });
    }

    if (external.providerBindingId) {
      const existing = await prisma.marketingCampaignProviderBinding.findUnique({
        where: { id: external.providerBindingId },
      });
      if (existing && existing.campaignId !== input.campaignId) {
        throw new Error(
          `Google campaign already linked to another internal campaign (${existing.campaignId})`,
        );
      }
    }

    const binding = await prisma.marketingCampaignProviderBinding.upsert({
      where: {
        campaignId_providerId_externalCampaignId: {
          campaignId: input.campaignId,
          providerId,
          externalCampaignId: input.externalCampaignId,
        },
      },
      create: {
        campaignId: input.campaignId,
        providerId,
        adAccountId: input.adAccountId,
        externalCampaignId: input.externalCampaignId,
        externalCampaignName: external.name,
        status: "linked",
        syncStatus: "idle",
      },
      update: {
        adAccountId: input.adAccountId,
        externalCampaignName: external.name,
        status: "linked",
        syncStatus: "idle",
        lastSyncError: null,
      },
    });

    await prisma.marketingExternalCampaign.update({
      where: { id: external.id },
      data: {
        providerBindingId: binding.id,
        adAccountId: input.adAccountId,
      },
    });

    const landing = (campaign.landingPagePath ?? "").trim() || "/";
    let trackingUrl = await prisma.marketingTrackingUrl.findFirst({
      where: { providerBindingId: binding.id },
    });
    if (!trackingUrl) {
      trackingUrl = await trackingUrlService.create({
        campaignId: campaign.id,
        baseUrl: landing,
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: campaign.internalId,
        utmContent: binding.id,
        providerBindingId: binding.id,
        label: `Google Ads · ${external.name}`,
      });
    }

    let sync: Awaited<
      ReturnType<
        typeof import("@/modules/marketing/ads/sync-service").adSyncService.syncBoundCampaign
      >
    > | null = null;
    if (!input.skipSync) {
      const { adSyncService } = await import("@/modules/marketing/ads/sync-service");
      sync = await adSyncService.syncBoundCampaign(binding.id);
    }

    return {
      binding: await prisma.marketingCampaignProviderBinding.findUniqueOrThrow({
        where: { id: binding.id },
      }),
      trackingUrl,
      sync,
    };
  },

  async removeProviderBinding(bindingId: string) {
    const binding = await prisma.marketingCampaignProviderBinding.findUnique({
      where: { id: bindingId },
    });
    if (!binding) return null;

    await prisma.marketingExternalCampaign.updateMany({
      where: { providerBindingId: bindingId },
      data: { providerBindingId: null },
    });

    return prisma.marketingCampaignProviderBinding.delete({ where: { id: bindingId } });
  },

  /** @deprecated Prefer findByCampaignParam */
  async findByUtmCampaign(utmCampaign: string) {
    return this.findByCampaignParam(utmCampaign);
  },

  /**
   * Resolve first-party campaign from campaign / a / utm_campaign param value.
   * Matches MarketingCampaign.internalId first, then MarketingTrackingUrl.utmCampaign.
   */
  async findByCampaignParam(param: string) {
    const value = param.trim();
    if (!value) return null;
    const byInternal = await prisma.marketingCampaign.findFirst({
      where: { internalId: value },
    });
    if (byInternal) return byInternal;
    const url = await prisma.marketingTrackingUrl.findFirst({
      where: { utmCampaign: value },
      include: { campaign: true },
    });
    return url?.campaign ?? null;
  },

  async getPerformance(campaignId: string): Promise<CampaignPerformance> {
    const [pageViews, sessionRows, attributions, eventSessions, bindings, conversions] =
      await Promise.all([
        prisma.marketingEvent.count({
          where: {
            internalCampaignId: campaignId,
            name: { in: ["PageView", "LandingPageView"] },
          },
        }),
        prisma.marketingTouch.findMany({
          where: { internalCampaignId: campaignId },
          select: { sessionId: true },
          distinct: ["sessionId"],
        }),
        prisma.marketingLeadAttribution.findMany({
          where: { internalCampaignId: campaignId },
          select: { submissionId: true, inquiryId: true },
        }),
        prisma.marketingEvent.findMany({
          where: {
            internalCampaignId: campaignId,
            sessionId: { not: null },
          },
          select: { sessionId: true },
          distinct: ["sessionId"],
        }),
        prisma.marketingCampaignProviderBinding.findMany({
          where: { campaignId, status: "linked" },
          select: { id: true, providerId: true },
        }),
        prisma.marketingConversion.count({
          where: { internalCampaignId: campaignId },
        }),
      ]);

    const sessionIds = new Set<string>();
    for (const row of sessionRows) sessionIds.add(row.sessionId);
    for (const row of eventSessions) {
      if (row.sessionId) sessionIds.add(row.sessionId);
    }

    const submissionIds = attributions
      .map((a) => a.submissionId)
      .filter((id): id is string => Boolean(id));
    const inquiryIds = attributions
      .map((a) => a.inquiryId)
      .filter((id): id is string => Boolean(id));

    const [qualifiedForms, qualifiedInquiries] = await Promise.all([
      submissionIds.length
        ? prisma.formSubmission.count({
            where: { id: { in: submissionIds }, pipelineType: "qualified" },
          })
        : Promise.resolve(0),
      inquiryIds.length
        ? prisma.inquiry.count({
            where: { id: { in: inquiryIds }, status: "CONTACTED" },
          })
        : Promise.resolve(0),
    ]);

    const bindingIds = bindings.map((b) => b.id);
    const rollups = bindingIds.length
      ? await prisma.marketingMetricRollup.findMany({
          where: {
            internalCampaignId: campaignId,
            providerBindingId: { in: bindingIds },
          },
          orderBy: { periodEnd: "desc" },
        })
      : [];

    // Prefer latest 30-day-ish rollups per binding (aggregate unique by binding taking max period)
    const latestByBinding = new Map<string, (typeof rollups)[number]>();
    for (const r of rollups) {
      if (!r.providerBindingId) continue;
      const existing = latestByBinding.get(r.providerBindingId);
      if (!existing || r.periodEnd > existing.periodEnd) {
        latestByBinding.set(r.providerBindingId, r);
      }
    }

    let spend = 0;
    let impressions = 0;
    let clicks = 0;
    let adsConversions = 0;
    for (const r of latestByBinding.values()) {
      spend += r.spend;
      impressions += r.impressions;
      clicks += r.clicks;
      const meta = (r.metadata as Record<string, unknown>) ?? {};
      adsConversions += Number(meta.adsConversions ?? 0);
    }

    const leads = attributions.length;
    const qualifiedLeads = qualifiedForms + qualifiedInquiries;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;

    return {
      pageViews,
      sessions: sessionIds.size,
      leads,
      qualifiedLeads,
      google: {
        spend,
        impressions,
        clicks,
        adsConversions,
        ctr,
        cpc,
      },
      website: {
        sessions: sessionIds.size,
        pageViews,
        leads,
        qualifiedLeads,
        firstPartyConversions: conversions,
      },
      joined: {
        cpl: leads > 0 ? spend / leads : 0,
        costPerQualifiedLead: qualifiedLeads > 0 ? spend / qualifiedLeads : 0,
      },
      googleBindingCount: bindings.filter((b) => b.providerId === "google-ads").length,
    };
  },

  async getBindingScorecards(campaignId: string) {
    const bindings = await prisma.marketingCampaignProviderBinding.findMany({
      where: { campaignId, status: "linked" },
      include: {
        adAccount: true,
        trackingUrls: { orderBy: { createdAt: "desc" }, take: 1 },
        externalCampaigns: {
          include: {
            adGroups: {
              include: { ads: { take: 20 } },
              take: 50,
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const cards = [];
    for (const b of bindings) {
      const rollup = await prisma.marketingMetricRollup.findFirst({
        where: { providerBindingId: b.id },
        orderBy: { periodEnd: "desc" },
      });
      const meta = (b.providerMetadata as Record<string, unknown>) ?? {};
      const rollupMeta = (rollup?.metadata as Record<string, unknown>) ?? {};
      cards.push({
        binding: b,
        spend: rollup?.spend ?? 0,
        impressions: rollup?.impressions ?? 0,
        clicks: rollup?.clicks ?? 0,
        adsConversions: Number(rollupMeta.adsConversions ?? 0),
        channelType: typeof meta.channelType === "string" ? meta.channelType : null,
        googleStatus: typeof meta.status === "string" ? meta.status : b.externalCampaigns[0]?.status ?? null,
      });
    }
    return cards;
  },

  async getRecentSessions(campaignId: string, take = 20) {
    const touches = await prisma.marketingTouch.findMany({
      where: { internalCampaignId: campaignId },
      orderBy: { occurredAt: "desc" },
      take: take * 3,
      include: {
        session: true,
        visitor: true,
      },
    });
    const seen = new Set<string>();
    const sessions: Array<{
      id: string;
      entryUrl: string | null;
      landingPagePath: string | null;
      referrer: string | null;
      deviceType: string | null;
      browser: string | null;
      os: string | null;
      country: string | null;
      region: string | null;
      startedAt: Date;
      visitorFirstSeenAt: Date;
      visitorLastSeenAt: Date;
    }> = [];
    for (const t of touches) {
      if (seen.has(t.sessionId)) continue;
      seen.add(t.sessionId);
      sessions.push({
        id: t.session.id,
        entryUrl: t.session.entryUrl,
        landingPagePath: t.session.landingPagePath,
        referrer: t.session.referrer,
        deviceType: t.session.deviceType,
        browser: t.session.browser,
        os: t.session.os,
        country: t.session.country,
        region: t.session.region,
        startedAt: t.session.startedAt,
        visitorFirstSeenAt: t.visitor.firstSeenAt,
        visitorLastSeenAt: t.visitor.lastSeenAt,
      });
      if (sessions.length >= take) break;
    }
    return sessions;
  },

  async getRecentLeads(campaignId: string, take = 20) {
    const rows = await prisma.marketingLeadAttribution.findMany({
      where: { internalCampaignId: campaignId },
      orderBy: { createdAt: "desc" },
      take,
    });
    const submissionIds = rows
      .map((r) => r.submissionId)
      .filter((id): id is string => Boolean(id));
    const inquiryIds = rows.map((r) => r.inquiryId).filter((id): id is string => Boolean(id));
    const [submissions, inquiries] = await Promise.all([
      submissionIds.length
        ? prisma.formSubmission.findMany({
            where: { id: { in: submissionIds } },
            select: { id: true, pipelineType: true, status: true, createdAt: true },
          })
        : Promise.resolve([]),
      inquiryIds.length
        ? prisma.inquiry.findMany({
            where: { id: { in: inquiryIds } },
            select: { id: true, status: true, createdAt: true, name: true, email: true },
          })
        : Promise.resolve([]),
    ]);
    const subMap = new Map(submissions.map((s) => [s.id, s]));
    const inqMap = new Map(inquiries.map((i) => [i.id, i]));
    return rows.map((r) => ({
      ...r,
      submission: r.submissionId ? subMap.get(r.submissionId) ?? null : null,
      inquiry: r.inquiryId ? inqMap.get(r.inquiryId) ?? null : null,
    }));
  },
};
