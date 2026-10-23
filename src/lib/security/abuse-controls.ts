/**
 * Pure helpers for public-endpoint abuse controls. Kept free of `server-only`
 * so they are unit-testable and reusable from edge contexts.
 */

/**
 * Trusted client IP.
 *
 * Forwarding headers are ignored unless the deployment has been verified:
 * the edge proxy overwrites `x-real-ip`, and the Node port is not reachable
 * except through that proxy. Set AZURA_TRUST_PROXY_HEADERS=1 only after that
 * check. Until then this returns "unknown" and IP-based limits stay off.
 *
 * When AZURA_TRUST_FORWARDED_FOR=1, AZURA_TRUSTED_PROXY_COUNT is required.
 * The client address is that many hops from the right of X-Forwarded-For
 * (count 1 = the rightmost hop). A short chain returns "unknown".
 */
export function resolveTrustedClientIp(input: {
  realIp: string | null | undefined;
  forwardedFor: string | null | undefined;
  trustProxyHeaders: boolean;
  trustForwardedFor: boolean;
  trustedProxyCount: number;
}): string {
  if (!input.trustProxyHeaders) return "unknown";

  const realIp = input.realIp?.trim();
  if (realIp) return realIp;

  if (!input.trustForwardedFor) return "unknown";
  const count = input.trustedProxyCount;
  if (!Number.isInteger(count) || count < 1) return "unknown";

  const hops = (input.forwardedFor ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  const index = hops.length - count;
  if (index < 0) return "unknown";
  return hops[index] ?? "unknown";
}

/** Multipart form uploads: document max (16MB) plus overhead. */
export const PUBLIC_FORM_BODY_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Reject a body before it is parsed.
 * A missing or non-numeric Content-Length is refused so chunked requests
 * cannot skip the cap.
 */
export function classifyContentLength(
  header: string | null | undefined,
  maxBytes: number,
): "ok" | "missing" | "too_large" {
  const raw = header?.trim() ?? "";
  if (!raw) return "missing";
  if (!/^\d+$/.test(raw)) return "missing";
  const length = Number(raw);
  if (!Number.isSafeInteger(length)) return "missing";
  if (length > maxBytes) return "too_large";
  return "ok";
}

/** Production with no TURNSTILE_SECRET_KEY must reject; dev/test stays open. */
export function resolveTurnstileMissingKeyPolicy(nodeEnv: string | undefined): "allow" | "deny" {
  return nodeEnv === "production" ? "deny" : "allow";
}
