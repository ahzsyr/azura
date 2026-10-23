import "server-only";

import { resolveTrustedClientIp } from "@/lib/security/abuse-controls";

export { resolveTrustedClientIp } from "@/lib/security/abuse-controls";

/**
 * Trusted client IP. See resolveTrustedClientIp.
 *
 * AZURA_TRUST_PROXY_HEADERS=1 is required before any forwarding header is
 * read. That flag means the proxy overwrites x-real-ip and direct access to
 * the app origin is blocked. AZURA_TRUST_FORWARDED_FOR=1 additionally trusts
 * X-Forwarded-For, using AZURA_TRUSTED_PROXY_COUNT hops from the right.
 */
export function getTrustedClientIp(request: Request): string {
  const count = Number(process.env.AZURA_TRUSTED_PROXY_COUNT);
  return resolveTrustedClientIp({
    realIp: request.headers.get("x-real-ip"),
    forwardedFor: request.headers.get("x-forwarded-for"),
    trustProxyHeaders: process.env.AZURA_TRUST_PROXY_HEADERS === "1",
    trustForwardedFor: process.env.AZURA_TRUST_FORWARDED_FOR === "1",
    trustedProxyCount: Number.isFinite(count) ? count : 0,
  });
}
