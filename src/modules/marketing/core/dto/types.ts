import type { CanonicalAssetKind } from "@/modules/marketing/core/manifests/types";

export type CanonicalPublishRequest = {
  idempotencyKey: string;
  providerId: string;
  connectionId: string;
  accountId: string;
  assetId?: string;
  text: string;
  mediaUrls?: string[];
  linkUrl?: string;
  scheduledAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type CanonicalPublishResult = {
  ok: boolean;
  externalPostId?: string;
  permalink?: string;
  message?: string;
  providerPayload?: unknown;
};

export type CanonicalAnalyticsMetric = {
  providerId: string;
  accountId: string;
  metric:
    | "reach"
    | "impressions"
    | "engagement"
    | "likes"
    | "shares"
    | "comments"
    | "followers"
    | "clicks"
    | "conversions";
  value: number;
  periodStart: string;
  periodEnd: string;
  dimensions?: Record<string, string>;
};

export type CanonicalTrackingEventName =
  | "ProductViewed"
  | "LeadGenerated"
  | "Purchase"
  | "FormSubmitted"
  | "Search"
  | "NewsletterSignup"
  | "PageView";

export type CanonicalTrackingEvent = {
  idempotencyKey: string;
  name: CanonicalTrackingEventName;
  occurredAt: string;
  source: string;
  user?: { email?: string; phone?: string; externalId?: string };
  properties?: Record<string, unknown>;
  value?: number;
  currency?: string;
};

export type CanonicalLeadEvent = {
  idempotencyKey: string;
  providerId: string;
  externalLeadId: string;
  formId?: string;
  name?: string;
  email?: string;
  phone?: string;
  fields: Record<string, string>;
  receivedAt: string;
  raw?: unknown;
};

export type CanonicalWebhookEvent = {
  providerId: string;
  eventType: string;
  externalEventId?: string;
  occurredAt: string;
  payload: unknown;
  signatureValid: boolean;
};

export type CanonicalAsset = {
  kind: CanonicalAssetKind;
  providerAssetType: string;
  externalId: string;
  displayName: string;
  metadata?: Record<string, unknown>;
};
