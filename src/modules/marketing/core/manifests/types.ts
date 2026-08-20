import type { MarketingCapabilityId } from "@/modules/marketing/core/capabilities/types";

export type CanonicalAssetKind =
  | "page"
  | "company"
  | "businessProfile"
  | "adAccount"
  | "leadForm"
  | "mediaLibrary"
  | "catalogue"
  | "pixel"
  | "channel";

export type SupportedMediaKind = "image" | "video" | "carousel" | "document" | "reel";

export type ProviderOAuthConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Relative callback path on this app. */
  callbackPath: string;
};

export type ProviderVersionInfo = {
  apiVersion: string;
  sdkVersion: string;
  minimumSupportedVersion: string;
  deprecatedAfter?: string | null;
};

export type ProviderManifest = {
  id: string;
  displayName: string;
  icon: string;
  documentationUrl?: string;
  capabilities: MarketingCapabilityId[];
  supportedAssets: CanonicalAssetKind[];
  supportedMedia: SupportedMediaKind[];
  oauthConfig: ProviderOAuthConfig;
  featureFlags: Record<string, boolean>;
  version: ProviderVersionInfo;
  supportsScheduling: boolean;
  supportsInsights: boolean;
  supportsMessaging: boolean;
  healthChecks: string[];
};

export type ProviderLifecycleState =
  | "discovered"
  | "configured"
  | "connected"
  | "healthy"
  | "degraded"
  | "disconnected"
  | "disabled"
  | "retired";

export type MarketingProviderRuntime = {
  providerId: string;
  enabled: boolean;
  installedVersion: string;
  lifecycle: ProviderLifecycleState;
  maintenanceMode: boolean;
  lastSyncAt?: string | null;
  healthSummary?: string | null;
};
