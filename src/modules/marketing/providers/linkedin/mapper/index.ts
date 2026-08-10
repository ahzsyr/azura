import type {
  CanonicalAnalyticsMetric,
  CanonicalPublishRequest,
  CanonicalPublishResult,
  CanonicalWebhookEvent,
} from "@/modules/marketing/core/dto/types";
import type { CanonicalAsset } from "@/modules/marketing/core/dto/types";

export function mapLinkedInOrgToCanonicalAsset(org: {
  id: string | number;
  localizedName?: string;
}): CanonicalAsset {
  return {
    kind: "company",
    providerAssetType: "linkedin_organization",
    externalId: String(org.id),
    displayName: org.localizedName ?? String(org.id),
  };
}

export function mapLinkedInAnalyticsToCanonical(
  providerId: string,
  accountId: string,
  period: { from: string; to: string },
  values: Partial<Record<CanonicalAnalyticsMetric["metric"], number>>,
): CanonicalAnalyticsMetric[] {
  return (Object.entries(values) as Array<[CanonicalAnalyticsMetric["metric"], number]>).map(
    ([metric, value]) => ({
      providerId,
      accountId,
      metric,
      value,
      periodStart: period.from,
      periodEnd: period.to,
    }),
  );
}

export function mapLinkedInWebhook(raw: unknown): CanonicalWebhookEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { eventType?: string; id?: string };
  return {
    providerId: "linkedin",
    eventType: body.eventType ?? "linkedin.event",
    externalEventId: body.id,
    occurredAt: new Date().toISOString(),
    payload: raw,
    signatureValid: true,
  };
}

export function toLinkedInPublishPayload(request: CanonicalPublishRequest) {
  return { commentary: request.text, link: request.linkUrl };
}

export function fromLinkedInPublishResponse(response: {
  ok: boolean;
  id?: string;
  message?: string;
}): CanonicalPublishResult {
  return {
    ok: response.ok,
    externalPostId: response.id,
    message: response.message,
  };
}
