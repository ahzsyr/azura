import { NextResponse } from "next/server";
import {
  marketingIngressSkipBody,
  marketingIngressSkipResponse,
  marketingWebhookInactiveGetResponse,
  type MarketingIngressDecision,
  type MarketingIngressDenyReason,
} from "@/modules/marketing/ingress-decision";

type ResolveAccess = () => Promise<MarketingIngressDecision>;

/** Public beacon: guard before any side-effect callback. */
export async function runMarketingBeaconIngress<T>(
  resolveAccess: ResolveAccess,
  run: () => Promise<T>,
): Promise<T | { skipped: true; reason: MarketingIngressDenyReason }> {
  const access = await resolveAccess();
  if (!access.allow) return marketingIngressSkipBody(access.reason);
  return run();
}

export async function handleMarketingJobsIngress(deps: {
  resolveAccess: ResolveAccess;
  authorize: () => Promise<"ok" | "unauthorized">;
  run: () => Promise<{
    scheduled: unknown;
    processed: number;
    results: unknown[];
  }>;
}): Promise<NextResponse> {
  const auth = await deps.authorize();
  if (auth === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = await deps.resolveAccess();
  if (!access.allow) {
    return NextResponse.json({ ok: true, skipped: true, reason: access.reason });
  }
  const result = await deps.run();
  return NextResponse.json({ ok: true, ...result });
}

export async function handleMarketingWebhookGetIngress(deps: {
  resolveAccess: ResolveAccess;
  completeChallenge: () => Promise<NextResponse | null>;
}): Promise<NextResponse> {
  const access = await deps.resolveAccess();
  if (!access.allow) {
    return marketingWebhookInactiveGetResponse(access.reason);
  }
  const challenge = await deps.completeChallenge();
  if (challenge) return challenge;
  return NextResponse.json({ ok: true });
}

export async function handleMarketingWebhookPostIngress(deps: {
  resolveAccess: ResolveAccess;
  ingest: () => Promise<
    | { skipped: true }
    | { id: string; status: string }
  >;
}): Promise<NextResponse> {
  const access = await deps.resolveAccess();
  if (!access.allow) {
    return NextResponse.json({ ok: true, skipped: true, reason: access.reason });
  }
  try {
    const event = await deps.ingest();
    if (!("id" in event)) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    return NextResponse.json({ ok: true, id: event.id, status: event.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function handleMarketingOAuthStartIngress(deps: {
  resolveAccess: ResolveAccess;
  inactiveRedirect: (reason: MarketingIngressDenyReason) => NextResponse;
  start: () => Promise<NextResponse>;
}): Promise<NextResponse> {
  const access = await deps.resolveAccess();
  if (!access.allow) return deps.inactiveRedirect(access.reason);
  return deps.start();
}

export async function handleMarketingOAuthCallbackIngress(deps: {
  resolveAccess: ResolveAccess;
  /** CSRF / state validation. Runs before the inactive short-circuit persist path. */
  validateState: () => "ok" | "oauth_state";
  stateInvalidRedirect: () => NextResponse;
  inactiveRedirect: (reason: MarketingIngressDenyReason) => NextResponse;
  clearOAuthCookies: (response: NextResponse) => void;
  exchangeAndPersist: () => Promise<NextResponse>;
}): Promise<NextResponse> {
  const state = deps.validateState();
  if (state !== "ok") {
    const response = deps.stateInvalidRedirect();
    deps.clearOAuthCookies(response);
    return response;
  }
  const access = await deps.resolveAccess();
  if (!access.allow) {
    const response = deps.inactiveRedirect(access.reason);
    deps.clearOAuthCookies(response);
    return response;
  }
  return deps.exchangeAndPersist();
}

export { marketingIngressSkipResponse };
