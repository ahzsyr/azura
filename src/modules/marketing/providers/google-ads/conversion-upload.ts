import "server-only";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_PROVIDER_ID } from "@/modules/marketing/providers/google-ads/manifest";

const CONVERSION_QUALITY_EVENTS = new Set([
  "LeadGenerated",
  "FormSubmitted",
  "QualifiedLead",
  "Purchase",
  "RfqSubmitted",
]);

/**
 * Resolve Google Ads offline conversion upload fields for a marketing event.
 * Consent-gated: DENIED/WITHDRAWN skips upload enrichment.
 */
export async function resolveGoogleAdsConversionUploadProps(input: {
  eventName: string;
  visitorId?: string | null;
  touchId?: string | null;
  internalCampaignId?: string | null;
  properties?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  if (!CONVERSION_QUALITY_EVENTS.has(input.eventName)) {
    return {};
  }

  if (input.visitorId) {
    const visitor = await prisma.marketingVisitor.findUnique({
      where: { id: input.visitorId },
      select: { consentStatus: true },
    });
    if (
      visitor?.consentStatus === "DENIED" ||
      visitor?.consentStatus === "WITHDRAWN"
    ) {
      return { googleAdsUploadSkipped: "consent_denied" };
    }
  }

  const existing = input.properties ?? {};
  if (
    existing.gclid &&
    (existing.googleConversionActionId || existing.conversionActionResourceName) &&
    existing.connectionId &&
    existing.customerId
  ) {
    return {};
  }

  const touch = input.touchId
    ? await prisma.marketingTouch.findUnique({ where: { id: input.touchId } })
    : input.visitorId
      ? await prisma.marketingTouch.findFirst({
          where: {
            visitorId: input.visitorId,
            OR: [{ clickIdType: "GCLID" }, { providerBindingId: { not: null } }],
          },
          orderBy: { occurredAt: "desc" },
        })
      : null;

  const gclid =
    (typeof existing.gclid === "string" && existing.gclid) ||
    (touch?.clickIdType === "GCLID" ? touch.clickId : null);
  if (!gclid) {
    return { googleAdsUploadSkipped: "missing_gclid" };
  }

  const bindingId =
    (typeof existing.providerBindingId === "string" && existing.providerBindingId) ||
    touch?.providerBindingId ||
    null;

  let binding = bindingId
    ? await prisma.marketingCampaignProviderBinding.findUnique({
        where: { id: bindingId },
        include: { adAccount: true },
      })
    : null;

  if (!binding && input.internalCampaignId) {
    const linked = await prisma.marketingCampaignProviderBinding.findMany({
      where: {
        campaignId: input.internalCampaignId,
        providerId: GOOGLE_ADS_PROVIDER_ID,
        status: "linked",
      },
      include: { adAccount: true },
    });
    if (linked.length === 1) binding = linked[0]!;
  }

  if (!binding?.adAccount) {
    return { gclid, googleAdsUploadSkipped: "missing_binding" };
  }

  const meta = (binding.providerMetadata ?? {}) as Record<string, unknown>;
  let conversionActionId =
    (typeof existing.googleConversionActionId === "string" &&
      existing.googleConversionActionId) ||
    (typeof meta.conversionActionId === "string" && meta.conversionActionId) ||
    (typeof meta.googleConversionActionId === "string" &&
      meta.googleConversionActionId) ||
    null;

  if (!conversionActionId) {
    const def = await prisma.marketingConversionDefinition.findFirst({
      where: {
        enabled: true,
        OR: [
          { key: input.eventName },
          { key: input.eventName.toLowerCase() },
          { triggerType: input.eventName },
        ],
      },
    });
    const cfg = (def?.triggerConfig ?? {}) as Record<string, unknown>;
    conversionActionId =
      (typeof cfg.googleConversionActionId === "string" &&
        cfg.googleConversionActionId) ||
      (typeof cfg.conversionActionId === "string" && cfg.conversionActionId) ||
      null;
  }

  if (!conversionActionId) {
    return {
      gclid,
      providerBindingId: binding.id,
      connectionId: binding.adAccount.connectionId,
      customerId: binding.adAccount.externalAccountId,
      googleAdsUploadSkipped: "missing_conversion_action",
    };
  }

  return {
    gclid,
    providerBindingId: binding.id,
    connectionId: binding.adAccount.connectionId,
    customerId: binding.adAccount.externalAccountId,
    googleConversionActionId: conversionActionId,
  };
}

export function isGoogleAdsConversionQualityEvent(name: string) {
  return CONVERSION_QUALITY_EVENTS.has(name);
}
