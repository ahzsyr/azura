import "server-only";
import { prisma } from "@/lib/prisma";
import type { MarketingClickIdType, MarketingTouchType, Prisma } from "@prisma/client";
import {
  classifyTrafficType,
  mapUtmSourceToKey,
  resolveSourceByKey,
} from "@/modules/marketing/sources/service";
import { campaignService } from "@/modules/marketing/campaigns/service";

export type CaptureAttributionInput = {
  visitorToken: string;
  sessionToken: string;
  consentStatus?: "UNKNOWN" | "GRANTED" | "DENIED" | "WITHDRAWN";
  entryUrl?: string;
  landingPagePath?: string;
  referrer?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  /** Canonical first-party campaign param (campaign / a / utm_campaign) */
  campaignParam?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** Binding discriminator from binding= or utm_content */
  bindingId?: string | null;
  clickIdType?: MarketingClickIdType | null;
  clickId?: string | null;
  clientOccurredAt?: string;
  rawPayload?: Record<string, unknown>;
  /** When false, only bump visitor/session activity — do not create a MarketingTouch */
  createTouch?: boolean;
};

function classifyTouchType(input: CaptureAttributionInput): MarketingTouchType {
  if (input.clickIdType) return "PAID_CLICK";
  const medium = (input.utmMedium ?? "").toLowerCase();
  if (medium.includes("cpc") || medium.includes("paid") || medium.includes("ppc")) return "PAID_CLICK";
  if (medium === "email") return "EMAIL";
  if (medium === "organic") return "ORGANIC_SEARCH";
  if (medium === "referral" || (input.referrer && !input.utmSource)) return "REFERRAL";
  if ((input.utmSource || input.utmCampaign || input.campaignParam) && !input.clickId) {
    return "CAMPAIGN_URL";
  }
  if (!input.utmSource && !input.utmMedium && !input.referrer) return "DIRECT";
  const source = (input.utmSource ?? "").toLowerCase();
  if (["facebook", "instagram", "twitter", "linkedin", "tiktok"].some((s) => source.includes(s))) {
    return medium.includes("paid") ? "PAID_CLICK" : "SOCIAL_ORGANIC";
  }
  return "DIRECT";
}

export const attributionService = {
  async capture(input: CaptureAttributionInput) {
    const now = input.clientOccurredAt ? new Date(input.clientOccurredAt) : new Date();
    const consentStatus = input.consentStatus ?? "UNKNOWN";

    // Without marketing consent, do not persist visitor analytics cookies/records.
    if (consentStatus === "DENIED" || consentStatus === "WITHDRAWN") {
      return { skipped: true as const, reason: "consent_denied" };
    }

    const visitor = await prisma.marketingVisitor.upsert({
      where: { visitorToken: input.visitorToken },
      create: {
        visitorToken: input.visitorToken,
        consentStatus,
        consentGrantedAt: consentStatus === "GRANTED" ? now : null,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        lastSeenAt: now,
        ...(consentStatus === "GRANTED"
          ? { consentStatus, consentGrantedAt: now }
          : { consentStatus }),
      },
    });

    let session = await prisma.marketingSession.findUnique({
      where: { sessionToken: input.sessionToken },
    });
    if (!session) {
      session = await prisma.marketingSession.create({
        data: {
          visitorId: visitor.id,
          sessionToken: input.sessionToken,
          entryUrl: input.entryUrl,
          landingPagePath: input.landingPagePath,
          referrer: input.referrer,
          deviceType: input.deviceType,
          browser: input.browser,
          os: input.os,
          country: input.country,
          region: input.region,
          startedAt: now,
        },
      });
    } else {
      // Activity bump — do not overwrite first-touch landing fields on the session
      await prisma.marketingSession.update({
        where: { id: session.id },
        data: {
          updatedAt: now,
          ...(input.deviceType && !session.deviceType ? { deviceType: input.deviceType } : {}),
          ...(input.browser && !session.browser ? { browser: input.browser } : {}),
          ...(input.os && !session.os ? { os: input.os } : {}),
          ...(input.country && !session.country ? { country: input.country } : {}),
          ...(input.region && !session.region ? { region: input.region } : {}),
        },
      });
    }

    const campaignKey =
      input.campaignParam?.trim() ||
      input.utmCampaign?.trim() ||
      null;
    const sourceKey = mapUtmSourceToKey(input.utmSource, input.clickIdType);
    const source = await resolveSourceByKey(sourceKey);
    const internalCampaign = campaignKey
      ? await campaignService.findByCampaignParam(campaignKey)
      : null;

    let providerBindingId: string | null = null;
    if (internalCampaign) {
      const googleBindings = await prisma.marketingCampaignProviderBinding.findMany({
        where: {
          campaignId: internalCampaign.id,
          providerId: "google-ads",
          status: "linked",
        },
      });
      const { resolveGoogleProviderBindingId } = await import(
        "@/modules/marketing/campaigns/binding-resolution"
      );
      providerBindingId = resolveGoogleProviderBindingId({
        googleBindingIds: googleBindings.map((b) => b.id),
        discriminator: input.bindingId?.trim() || input.utmContent?.trim() || null,
        isGooglePaid: input.clickIdType === "GCLID" || sourceKey === "google_ads",
      });
    }

    const createTouch = input.createTouch !== false;
    if (!createTouch) {
      return {
        skipped: false as const,
        visitorId: visitor.id,
        sessionId: session.id,
        touchId: null as string | null,
        sourceId: source?.id ?? null,
        internalCampaignId: internalCampaign?.id ?? null,
        providerBindingId,
        trafficType: classifyTrafficType(source?.category, input.utmMedium),
        activityOnly: true as const,
      };
    }

    const touchType = classifyTouchType(input);
    const isFirstTouch =
      (await prisma.marketingTouch.count({ where: { visitorId: visitor.id } })) === 0;

    const touch = await prisma.marketingTouch.create({
      data: {
        visitorId: visitor.id,
        sessionId: session.id,
        sourceId: source?.id ?? null,
        medium: input.utmMedium ?? null,
        internalCampaignId: internalCampaign?.id ?? null,
        providerBindingId,
        landingPagePath: input.landingPagePath ?? null,
        referrer: input.referrer ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? input.campaignParam ?? null,
        utmContent: input.utmContent ?? null,
        utmTerm: input.utmTerm ?? null,
        touchType: isFirstTouch ? "FIRST_TOUCH" : touchType,
        clickIdType: input.clickIdType ?? null,
        clickId: input.clickId ?? null,
        occurredAt: now,
        rawPayload: (input.rawPayload ?? {}) as Prisma.InputJsonValue,
      },
    });

    if (isFirstTouch && touchType !== "FIRST_TOUCH") {
      await prisma.marketingTouch.create({
        data: {
          visitorId: visitor.id,
          sessionId: session.id,
          sourceId: source?.id ?? null,
          medium: input.utmMedium ?? null,
          internalCampaignId: internalCampaign?.id ?? null,
          providerBindingId,
          landingPagePath: input.landingPagePath ?? null,
          referrer: input.referrer ?? null,
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? input.campaignParam ?? null,
          utmContent: input.utmContent ?? null,
          utmTerm: input.utmTerm ?? null,
          touchType: "SESSION_START",
          clickIdType: input.clickIdType ?? null,
          clickId: input.clickId ?? null,
          occurredAt: now,
        },
      });
    }

    return {
      skipped: false as const,
      visitorId: visitor.id,
      sessionId: session.id,
      touchId: touch.id,
      sourceId: source?.id ?? null,
      internalCampaignId: internalCampaign?.id ?? null,
      providerBindingId,
      trafficType: classifyTrafficType(source?.category, input.utmMedium),
    };
  },

  async getFirstTouch(visitorId: string) {
    return prisma.marketingTouch.findFirst({
      where: { visitorId },
      orderBy: { occurredAt: "asc" },
      include: { source: true },
    });
  },

  async getLastTouch(visitorId: string, before?: Date) {
    return prisma.marketingTouch.findFirst({
      where: {
        visitorId,
        ...(before ? { occurredAt: { lte: before } } : {}),
      },
      orderBy: { occurredAt: "desc" },
      include: { source: true },
    });
  },

  async getSessionTouch(sessionId: string) {
    return prisma.marketingTouch.findFirst({
      where: { sessionId },
      orderBy: { occurredAt: "asc" },
      include: { source: true },
    });
  },
};
