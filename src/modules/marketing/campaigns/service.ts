import "server-only";
import { prisma } from "@/lib/prisma";
import type { MarketingCampaignStatus, Prisma } from "@prisma/client";

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
        providerBindings: true,
        conversionGoal: true,
        _count: { select: { trackingUrls: true, conversions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.marketingCampaign.findUnique({
      where: { id },
      include: {
        providerBindings: { include: { adAccount: true, externalCampaigns: true } },
        trackingUrls: true,
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
    return prisma.marketingCampaign.create({
      data: {
        internalId,
        name: input.name.trim(),
        objective: input.objective ?? null,
        channel: input.channel ?? null,
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

  async removeProviderBinding(bindingId: string) {
    return prisma.marketingCampaignProviderBinding.delete({ where: { id: bindingId } });
  },

  async findByUtmCampaign(utmCampaign: string) {
    const url = await prisma.marketingTrackingUrl.findFirst({
      where: { utmCampaign },
      include: { campaign: true },
    });
    if (url?.campaign) return url.campaign;
    return prisma.marketingCampaign.findFirst({
      where: { internalId: utmCampaign },
    });
  },
};
