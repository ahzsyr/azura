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
    | "conversions"
    | "spend"
    | "cpc"
    | "cpm"
    | "ctr";
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
  | "PageView"
  | "LandingPageView"
  | "SolutionView"
  | "CtaClick"
  | "PhoneClick"
  | "WhatsAppClick"
  | "EmailClick"
  | "RfqSubmitted"
  | "QuoteRequest"
  | "AccountRegistration"
  | "Login"
  | "Download"
  | "VideoEngagement"
  | "Conversion";

export type CanonicalTrackingEvent = {
  idempotencyKey: string;
  name: CanonicalTrackingEventName;
  occurredAt: string;
  source: string;
  user?: { email?: string; phone?: string; externalId?: string };
  properties?: Record<string, unknown>;
  value?: number;
  currency?: string;
  clientOccurredAt?: string;
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

export type CanonicalAdAccount = {
  externalId: string;
  name: string;
  currency?: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

export type CanonicalExternalCampaign = {
  externalId: string;
  name: string;
  status?: string;
  providerEntityType?: string;
  adAccountExternalId?: string;
  metadata?: Record<string, unknown>;
};

export type CanonicalAdGroup = {
  externalId: string;
  name: string;
  status?: string;
  providerEntityType?: string;
  externalCampaignId: string;
  metadata?: Record<string, unknown>;
};

export type CanonicalAd = {
  externalId: string;
  name: string;
  status?: string;
  providerEntityType?: string;
  adGroupExternalId: string;
  metadata?: Record<string, unknown>;
};

export type CanonicalCreative = {
  externalId: string;
  name?: string;
  creativeType?: string;
  headline?: string;
  body?: string;
  previewUrl?: string;
  adExternalId: string;
  metadata?: Record<string, unknown>;
};

export type CanonicalAdMetrics = {
  providerId: string;
  externalCampaignId?: string;
  externalAdId?: string;
  accountId?: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  periodStart: string;
  periodEnd: string;
  dimensions?: Record<string, string>;
};

export type CanonicalClickIdType = "GCLID" | "FBCLID" | "MSCLKID" | "LI_FAT_ID" | "OTHER";

export type CanonicalTouchType =
  | "FIRST_TOUCH"
  | "SESSION_START"
  | "PAID_CLICK"
  | "ORGANIC_SEARCH"
  | "REFERRAL"
  | "EMAIL"
  | "SOCIAL_ORGANIC"
  | "DIRECT"
  | "CAMPAIGN_URL"
  | "CONVERSION_TOUCH";

export type CanonicalAttributionContext = {
  sourceKey?: string;
  medium?: string;
  internalCampaignId?: string;
  externalAdId?: string;
  landingPagePath?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  touchType?: CanonicalTouchType;
  clickIdType?: CanonicalClickIdType;
  clickId?: string;
};
