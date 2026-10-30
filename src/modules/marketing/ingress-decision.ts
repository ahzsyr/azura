import { NextResponse } from "next/server";

export type MarketingIngressDenyReason =
  | "profile_omitted"
  | "runtime_inactive"
  | "ledger_unavailable"
  | "env_disabled";

export type MarketingIngressDecision =
  | { allow: true }
  | { allow: false; reason: MarketingIngressDenyReason };

/** Pure decision used by tests and by the async resolver. */
export function decideMarketingIngress(input: {
  moduleAccess: "active" | "profile_omitted" | "runtime_inactive" | "ledger_unavailable";
  envCoreEnabled: boolean;
}): MarketingIngressDecision {
  if (input.moduleAccess !== "active") {
    return { allow: false, reason: input.moduleAccess };
  }
  if (!input.envCoreEnabled) {
    return { allow: false, reason: "env_disabled" };
  }
  return { allow: true };
}

/** Stable beacon / public-mutation skip body (HTTP 200). */
export function marketingIngressSkipBody(reason: MarketingIngressDenyReason) {
  return { skipped: true as const, reason };
}

export function marketingIngressSkipResponse(reason: MarketingIngressDenyReason): NextResponse {
  return NextResponse.json(marketingIngressSkipBody(reason), { status: 200 });
}

/** Webhook verification must not succeed while inactive. */
export function marketingWebhookInactiveGetResponse(
  reason: MarketingIngressDenyReason,
): NextResponse {
  return NextResponse.json(
    { ok: false, skipped: true, reason },
    { status: 404 },
  );
}
