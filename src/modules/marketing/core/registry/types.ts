import type { MarketingCapabilityId } from "@/modules/marketing/core/capabilities/types";
import type { ProviderManifest } from "@/modules/marketing/core/manifests/types";
import type {
  CanonicalAd,
  CanonicalAdAccount,
  CanonicalAdGroup,
  CanonicalAdMetrics,
  CanonicalAnalyticsMetric,
  CanonicalCreative,
  CanonicalExternalCampaign,
  CanonicalLeadEvent,
  CanonicalPublishRequest,
  CanonicalPublishResult,
  CanonicalTrackingEvent,
  CanonicalWebhookEvent,
} from "@/modules/marketing/core/dto/types";
import type { ProviderHealthReport } from "@/modules/marketing/core/health/types";

export type MarketingProviderAdapter = {
  id: string;
  manifest: ProviderManifest;
  capabilities(): MarketingCapabilityId[];
  health?(connectionId: string): Promise<ProviderHealthReport>;
  listAccounts?(connectionId: string): Promise<Array<{ externalId: string; name: string; type: string }>>;
  publish?(request: CanonicalPublishRequest): Promise<CanonicalPublishResult>;
  fetchAnalytics?(
    connectionId: string,
    accountId: string,
    period: { from: string; to: string },
  ): Promise<CanonicalAnalyticsMetric[]>;
  trackEvent?(event: CanonicalTrackingEvent): Promise<{ ok: boolean; message?: string }>;
  ingestLead?(event: CanonicalLeadEvent): Promise<{ ok: boolean; inquiryId?: string }>;
  mapWebhook?(raw: unknown, headers: Record<string, string>): Promise<CanonicalWebhookEvent | null>;
  verifyWebhookSignature?(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<boolean>;
  /** Advertising sync (optional — advertising providers implement these) */
  listAdAccounts?(connectionId: string): Promise<CanonicalAdAccount[]>;
  syncExternalCampaigns?(
    connectionId: string,
    adAccountId: string,
    cursor?: string,
  ): Promise<CanonicalExternalCampaign[]>;
  syncAdGroups?(connectionId: string, externalCampaignId: string): Promise<CanonicalAdGroup[]>;
  syncAds?(connectionId: string, adGroupExternalId: string): Promise<CanonicalAd[]>;
  syncCreatives?(connectionId: string, adExternalId: string): Promise<CanonicalCreative[]>;
  fetchCampaignMetrics?(
    connectionId: string,
    externalCampaignId: string,
    period: { from: string; to: string },
  ): Promise<CanonicalAdMetrics[]>;
};
