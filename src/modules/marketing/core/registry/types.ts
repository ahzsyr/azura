import type { MarketingCapabilityId } from "@/modules/marketing/core/capabilities/types";
import type { ProviderManifest } from "@/modules/marketing/core/manifests/types";
import type {
  CanonicalAnalyticsMetric,
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
};
