import "server-only";
import { prisma } from "@/lib/prisma";
import { attributionService } from "@/modules/marketing/attribution/service";
import { conversionService } from "@/modules/marketing/conversions/service";
import { marketingEventService } from "@/modules/marketing/events/service";
import { campaignService } from "@/modules/marketing/campaigns/service";
import { mapUtmSourceToKey, resolveSourceByKey } from "@/modules/marketing/sources/service";
import { marketingEventBus } from "@/modules/marketing/core/events";
import { resolveCampaignParamFromSearchParams } from "@/modules/marketing/tracking-urls/build-url";

/**
 * Conversion campaign resolution:
 * campaign → a → utm_campaign → stored session/touch campaign
 */
export async function resolveCampaignFromAttributionUtm(
  utm: Record<string, string> | null | undefined,
  visitorId: string | null,
): Promise<{ campaignId: string | null; campaignParam: string | null }> {
  const record = utm ?? {};
  const campaignParam = resolveCampaignParamFromSearchParams({
    campaign: record.campaign,
    a: record.a,
    utm_campaign: record.utm_campaign,
  });

  if (campaignParam) {
    const campaign = await campaignService.findByCampaignParam(campaignParam);
    if (campaign) return { campaignId: campaign.id, campaignParam };
  }

  if (visitorId) {
    const lastTouch = await attributionService.getLastTouch(visitorId);
    if (lastTouch?.internalCampaignId) {
      return {
        campaignId: lastTouch.internalCampaignId,
        campaignParam: lastTouch.utmCampaign ?? campaignParam,
      };
    }
  }

  return { campaignId: null, campaignParam };
}

/**
 * Bridge form submissions / inquiries / newsletter into marketing attribution + conversions.
 * Identity boundary: PII stays on FormSubmission/Inquiry/NewsletterSubscriber; MarketingLeadAttribution stores FKs only.
 */
export async function attachLeadAttributionFromUtm(input: {
  submissionId?: string;
  inquiryId?: string;
  subscriberId?: string;
  utm?: Record<string, string> | null;
  pageSlug?: string | null;
  conversionKey?: string;
}) {
  const utm = input.utm ?? {};
  const visitorToken = utm.visitor_token;
  const sessionToken = utm.session_token;
  const utmSource = utm.utm_source;
  const landingPagePath = utm.landing_page ?? (input.pageSlug ? `/${input.pageSlug}` : null);

  let visitorId: string | null = null;
  let sessionId: string | null = null;
  if (visitorToken) {
    const visitor = await prisma.marketingVisitor.findUnique({ where: { visitorToken } });
    visitorId = visitor?.id ?? null;
  }
  if (sessionToken) {
    const session = await prisma.marketingSession.findUnique({ where: { sessionToken } });
    sessionId = session?.id ?? null;
  }

  const source = await resolveSourceByKey(
    mapUtmSourceToKey(utmSource, utm.click_id_type),
  );

  const { campaignId, campaignParam } = await resolveCampaignFromAttributionUtm(utm, visitorId);

  const firstTouch = visitorId ? await attributionService.getFirstTouch(visitorId) : null;
  const lastTouch = visitorId ? await attributionService.getLastTouch(visitorId) : null;

  const attribution = await prisma.marketingLeadAttribution.create({
    data: {
      submissionId: input.submissionId ?? null,
      inquiryId: input.inquiryId ?? null,
      visitorId,
      sessionId,
      firstTouchId: firstTouch?.id ?? null,
      lastTouchId: lastTouch?.id ?? null,
      sourceId: source?.id ?? lastTouch?.sourceId ?? null,
      internalCampaignId: campaignId ?? lastTouch?.internalCampaignId ?? null,
      providerBindingId:
        lastTouch?.providerBindingId ?? firstTouch?.providerBindingId ?? null,
      landingPagePath,
      utmSource: utm.utm_source ?? null,
      utmMedium: utm.utm_medium ?? null,
      utmCampaign: campaignParam ?? utm.utm_campaign ?? null,
    },
  });

  const idempotencyBase = input.submissionId
    ? `form:${input.submissionId}`
    : input.inquiryId
      ? `inquiry:${input.inquiryId}`
      : input.subscriberId
        ? `newsletter:${input.subscriberId}`
        : `lead:${attribution.id}`;

  const eventName =
    input.conversionKey === "newsletter"
      ? "NewsletterSignup"
      : input.conversionKey === "rfq"
        ? "RfqSubmitted"
        : "FormSubmitted";

  await marketingEventService.ingest({
    idempotencyKey: `event:${idempotencyBase}`,
    name: eventName,
    visitorId,
    sessionId,
    touchId: lastTouch?.id ?? null,
    internalCampaignId: attribution.internalCampaignId,
    landingPagePath,
    sourceId: attribution.sourceId,
    clientOccurredAt: new Date().toISOString(),
    properties: {
      submissionId: input.submissionId,
      inquiryId: input.inquiryId,
      subscriberId: input.subscriberId,
      providerBindingId: attribution.providerBindingId,
      ...(lastTouch?.clickIdType === "GCLID" && lastTouch.clickId
        ? { gclid: lastTouch.clickId }
        : {}),
    },
  });

  await conversionService
    .record({
      idempotencyKey: idempotencyBase,
      conversionDefinitionKey: input.conversionKey ?? "form_submit",
      visitorId,
      sessionId,
      touchId: lastTouch?.id ?? null,
      internalCampaignId: attribution.internalCampaignId,
      landingPagePath,
      sourceId: attribution.sourceId,
      submissionId: input.submissionId ?? null,
      leadId: input.inquiryId ?? input.subscriberId ?? null,
      clientOccurredAt: new Date().toISOString(),
    })
    .catch(() => undefined);

  if (input.submissionId) {
    await marketingEventBus.emit("FORM_SUBMITTED", {
      submissionId: input.submissionId,
      formId: input.submissionId,
    });
  }
  if (input.inquiryId) {
    await marketingEventBus.emit("LEAD_CREATED", {
      inquiryId: input.inquiryId,
      source: "inquiry",
    });
  }

  return attribution;
}
