import type {
  CanonicalAnalyticsMetric,
  CanonicalLeadEvent,
  CanonicalPublishRequest,
  CanonicalPublishResult,
  CanonicalTrackingEvent,
  CanonicalWebhookEvent,
} from "@/modules/marketing/core/dto/types";
import type { CanonicalAsset } from "@/modules/marketing/core/dto/types";

export function mapMetaPageToCanonicalAsset(page: {
  id: string;
  name: string;
  category?: string;
}): CanonicalAsset {
  return {
    kind: "page",
    providerAssetType: "facebook_page",
    externalId: page.id,
    displayName: page.name,
    metadata: { category: page.category },
  };
}

export function mapMetaInsightsToCanonical(
  providerId: string,
  accountId: string,
  rows: Array<{ name: string; values?: Array<{ value: number }> }>,
  period: { from: string; to: string },
): CanonicalAnalyticsMetric[] {
  const metricMap: Record<string, CanonicalAnalyticsMetric["metric"]> = {
    page_impressions: "impressions",
    page_post_engagements: "engagement",
    page_fans: "followers",
    page_consumptions: "clicks",
  };

  return rows
    .map((row) => {
      const metric = metricMap[row.name];
      if (!metric) return null;
      return {
        providerId,
        accountId,
        metric,
        value: row.values?.[0]?.value ?? 0,
        periodStart: period.from,
        periodEnd: period.to,
      } satisfies CanonicalAnalyticsMetric;
    })
    .filter((row): row is CanonicalAnalyticsMetric => row !== null);
}

export function mapMetaLeadToCanonical(input: {
  leadId: string;
  formId?: string;
  fieldData?: Array<{ name: string; values: string[] }>;
  createdTime?: string;
}): CanonicalLeadEvent {
  const fields: Record<string, string> = {};
  for (const field of input.fieldData ?? []) {
    fields[field.name] = field.values?.[0] ?? "";
  }
  return {
    idempotencyKey: `meta-lead:${input.leadId}`,
    providerId: "meta",
    externalLeadId: input.leadId,
    formId: input.formId,
    name: fields.full_name || fields.name,
    email: fields.email,
    phone: fields.phone_number || fields.phone,
    fields,
    receivedAt: input.createdTime ?? new Date().toISOString(),
    raw: input,
  };
}

export function mapMetaWebhook(raw: unknown): CanonicalWebhookEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { object?: string; entry?: Array<{ id?: string; time?: number }> };
  return {
    providerId: "meta",
    eventType: body.object ?? "meta.event",
    externalEventId: body.entry?.[0]?.id,
    occurredAt: body.entry?.[0]?.time
      ? new Date(body.entry[0].time * 1000).toISOString()
      : new Date().toISOString(),
    payload: raw,
    signatureValid: true,
  };
}

export function toMetaPublishPayload(request: CanonicalPublishRequest) {
  return {
    message: request.text,
    link: request.linkUrl,
    scheduled_publish_time: request.scheduledAt
      ? Math.floor(new Date(request.scheduledAt).getTime() / 1000)
      : undefined,
  };
}

export function fromMetaPublishResponse(response: {
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

export function mapTrackingEventToMetaCapi(event: CanonicalTrackingEvent) {
  const eventNameMap: Record<string, string> = {
    ProductViewed: "ViewContent",
    LeadGenerated: "Lead",
    Purchase: "Purchase",
    FormSubmitted: "Lead",
    Search: "Search",
    NewsletterSignup: "CompleteRegistration",
    PageView: "PageView",
  };
  return {
    event_name: eventNameMap[event.name] ?? event.name,
    event_time: Math.floor(new Date(event.occurredAt).getTime() / 1000),
    event_id: event.idempotencyKey,
    user_data: {
      em: event.user?.email,
      ph: event.user?.phone,
      external_id: event.user?.externalId,
    },
    custom_data: event.properties,
  };
}
