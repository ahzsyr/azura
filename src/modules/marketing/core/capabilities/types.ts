/** Marketing capability identifiers. */
export const MARKETING_CAPABILITIES = [
  "connection",
  "publishing",
  "analytics",
  "tracking",
  "leadSync",
  "messaging",
  "advertising",
  "commerce",
] as const;

export type MarketingCapabilityId = (typeof MARKETING_CAPABILITIES)[number];

export type CapabilityBlockReason =
  | "missingPermission"
  | "missingDependency"
  | "providerUnavailable"
  | "featureFlagDisabled"
  | "unsupported"
  | "maintenanceMode"
  | "degraded";

export type CapabilityAvailability = {
  capability: MarketingCapabilityId;
  available: boolean;
  reason?: CapabilityBlockReason;
  missingDependencies?: MarketingCapabilityId[];
};

/** Explicit dependency graph — every capability except connection requires connection. */
export const CAPABILITY_DEPENDENCIES: Record<MarketingCapabilityId, MarketingCapabilityId[]> = {
  connection: [],
  publishing: ["connection"],
  analytics: ["connection"],
  tracking: ["connection"],
  leadSync: ["connection"],
  messaging: ["connection"],
  advertising: ["connection"],
  commerce: ["connection"],
};
