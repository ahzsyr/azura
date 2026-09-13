import "server-only";
import { prisma } from "@/lib/prisma";
import {
  buildShortShareUrl,
  buildTrackingUrl,
  getTrackingSiteOrigin,
} from "@/modules/marketing/tracking-urls/build-url";

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

export { buildTrackingUrl, buildShortShareUrl, getTrackingSiteOrigin };

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

    const hasOptionalUtm = Boolean(
      input.utmSource || input.utmMedium || input.utmContent || input.utmTerm || input.utmCampaign,
    );
    const utmCampaign = hasOptionalUtm
      ? input.utmCampaign?.trim() || campaign.internalId
      : null;
    const siteOrigin = getTrackingSiteOrigin();
    // Primary share link is always the short form: /a?identifier
    const fullUrl = buildShortShareUrl({
      campaignParam: campaign.internalId,
      siteOrigin,
    });

    return prisma.marketingTrackingUrl.create({
      data: {
        campaignId: input.campaignId,
        baseUrl: input.baseUrl,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: utmCampaign ?? campaign.internalId,
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
