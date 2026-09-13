import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { dispatchTrackingEvent } from "@/modules/marketing/tracking/dispatcher";
import type { CanonicalTrackingEventName } from "@/modules/marketing/core/dto/types";

export type IngestMarketingEventInput = {
  idempotencyKey: string;
  eventId?: string;
  name: string;
  visitorId?: string | null;
  sessionId?: string | null;
  touchId?: string | null;
  internalCampaignId?: string | null;
  landingPagePath?: string | null;
  sourceId?: string | null;
  medium?: string | null;
  properties?: Record<string, unknown>;
  clientOccurredAt: string;
  fanOut?: boolean;
};

export const marketingEventService = {
  async ingest(input: IngestMarketingEventInput) {
    const existing = await prisma.marketingEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return { event: existing, created: false };

    const event = await prisma.marketingEvent.create({
      data: {
        eventId: input.eventId ?? null,
        idempotencyKey: input.idempotencyKey,
        name: input.name,
        visitorId: input.visitorId ?? null,
        sessionId: input.sessionId ?? null,
        touchId: input.touchId ?? null,
        internalCampaignId: input.internalCampaignId ?? null,
        landingPagePath: input.landingPagePath ?? null,
        sourceId: input.sourceId ?? null,
        medium: input.medium ?? null,
        properties: (input.properties ?? {}) as Prisma.InputJsonValue,
        clientOccurredAt: new Date(input.clientOccurredAt),
        serverReceivedAt: new Date(),
      },
    });

    if (input.fanOut !== false) {
      const trackingName = mapToTrackingName(input.name);
      if (trackingName) {
        const { resolveGoogleAdsConversionUploadProps } = await import(
          "@/modules/marketing/providers/google-ads/conversion-upload"
        );
        const googleAdsProps = await resolveGoogleAdsConversionUploadProps({
          eventName: trackingName,
          visitorId: input.visitorId,
          touchId: input.touchId,
          internalCampaignId: input.internalCampaignId,
          properties: input.properties,
        }).catch(() => ({}));

        await dispatchTrackingEvent({
          idempotencyKey: input.idempotencyKey,
          name: trackingName,
          occurredAt: input.clientOccurredAt,
          source: "marketing_event",
          properties: {
            ...input.properties,
            ...googleAdsProps,
            marketingEventId: event.id,
            internalCampaignId: input.internalCampaignId,
            landingPagePath: input.landingPagePath,
          },
        }).catch(() => undefined);
      }
    }

    return { event, created: true };
  },
};

function mapToTrackingName(name: string): CanonicalTrackingEventName | null {
  const map: Record<string, CanonicalTrackingEventName> = {
    PageView: "PageView",
    LandingPageView: "LandingPageView",
    ProductViewed: "ProductViewed",
    SolutionView: "SolutionView",
    Search: "Search",
    CtaClick: "CtaClick",
    PhoneClick: "PhoneClick",
    WhatsAppClick: "WhatsAppClick",
    EmailClick: "EmailClick",
    FormSubmitted: "FormSubmitted",
    RfqSubmitted: "RfqSubmitted",
    QuoteRequest: "QuoteRequest",
    NewsletterSignup: "NewsletterSignup",
    LeadGenerated: "LeadGenerated",
    QualifiedLead: "QualifiedLead",
    AccountRegistration: "AccountRegistration",
    Login: "Login",
    Download: "Download",
    VideoEngagement: "VideoEngagement",
    Conversion: "Conversion",
    Purchase: "Purchase",
  };
  return map[name] ?? null;
}
