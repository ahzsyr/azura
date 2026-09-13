import type { GoogleAdsHealthItem, GoogleAdsOperationalContext, GoogleAdsReadiness } from "./health-types";

export type { GoogleAdsReadiness, GoogleAdsHealthItem, GoogleAdsOperationalContext };

/** Pure helper for unit tests and shared readiness rules. */
export function deriveGoogleAdsReadiness(input: {
  hasAccessToken: boolean;
  connectionStatus?: string | null;
  hasDeveloperToken: boolean;
  hasLoginCustomerId: boolean;
  selectedCustomerId?: string | null;
}): GoogleAdsReadiness {
  const oauthConnected =
    Boolean(input.hasAccessToken) && input.connectionStatus !== "degraded";
  const operational =
    oauthConnected &&
    input.hasDeveloperToken &&
    input.hasLoginCustomerId &&
    Boolean(input.selectedCustomerId);
  if (operational) return "operational";
  if (oauthConnected) return "setup_incomplete";
  return "not_connected";
}

export function mapOperationalToMarketingContext(ops: GoogleAdsOperationalContext) {
  return {
    connected: ops.operational,
    oauthConnected: ops.oauthConnected,
    operational: ops.operational,
    readiness: ops.readiness,
    customerId: ops.selectedCustomerId,
    loginCustomerId: ops.loginCustomerId,
    hasDeveloperToken: ops.hasDeveloperToken,
    hasLoginCustomerId: ops.hasLoginCustomerId,
    hasAccessToken: ops.hasAccessToken,
    accountCount: ops.accountCount,
    lastVerifiedAt: ops.lastVerifiedAt,
    summary: ops.summary,
    healthChecks: ops.healthChecks,
    legacySeoCustomerIdHint: ops.legacySeoCustomerIdHint,
  };
}
