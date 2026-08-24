import "server-only";
import { prisma } from "@/lib/prisma";
import { buildTrackingUrl } from "@/modules/marketing/tracking-urls/build-url";

export type TrackingUrlInput = {
  campaignId: string;
  baseUrl: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  providerBindingId?: string | null;
  externalAdId?: string | null;
  label?: string | null;
};

export { buildTrackingUrl };

export const trackingUrlService = {
  async list(campaignId?: string) {
    return prisma.marketingTrackingUrl.findMany({
      where: campaignId ? { campaignId } : undefined,
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(input: TrackingUrlInput) {
    const campaign = await prisma.marketingCampaign.findUnique({ where: { id: input.campaignId } });
    if (!campaign) throw new Error("Campaign not found");

    const utmCampaign = input.utmCampaign?.trim() || campaign.internalId;
    const fullUrl = buildTrackingUrl({
      baseUrl: input.baseUrl,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign,
      utmContent: input.utmContent,
      utmTerm: input.utmTerm,
    });

    return prisma.marketingTrackingUrl.create({
      data: {
        campaignId: input.campaignId,
        baseUrl: input.baseUrl,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign,
        utmContent: input.utmContent ?? null,
        utmTerm: input.utmTerm ?? null,
        fullUrl,
        providerBindingId: input.providerBindingId ?? null,
        externalAdId: input.externalAdId ?? null,
        label: input.label ?? null,
      },
    });
  },

  async delete(id: string) {
    return prisma.marketingTrackingUrl.delete({ where: { id } });
  },
};
