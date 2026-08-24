import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
]);

function isPrivateOrReservedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("ff")) return true; // multicast
    // IPv4-mapped
    if (lower.startsWith("::ffff:")) {
      const mapped = lower.slice("::ffff:".length);
      if (isIP(mapped) === 4) return isPrivateOrReservedIp(mapped);
    }
    return false;
  }
  return true;
}

export type SsrfGuardResult = { ok: true; url: URL } | { ok: false; reason: string };

/**
 * Validate an outbound URL for webhook/SSRF safety.
 * HTTPS required in production; blocks localhost, private, and link-local targets.
 */
export function assertSafeOutboundUrl(raw: string): SsrfGuardResult {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== "https:" && protocol !== "http:") {
    return { ok: false, reason: "Only http(s) URLs are allowed" };
  }
  if (process.env.NODE_ENV === "production" && protocol !== "https:") {
    return { ok: false, reason: "HTTPS required in production" };
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname) return { ok: false, reason: "Missing hostname" };
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: "Blocked hostname" };
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".localhost")) {
    return { ok: false, reason: "Blocked hostname" };
  }

  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { ok: false, reason: "Private or reserved IP blocked" };
    }
  }

  return { ok: true, url };
}

/** Throws if URL is unsafe. */
export function requireSafeOutboundUrl(raw: string): URL {
  const result = assertSafeOutboundUrl(raw);
  if (!result.ok) throw new Error(`SSRF blocked: ${result.reason}`);
  return result.url;
}

/**
 * Fetch that refuses private destinations. Does not follow redirects to keep SSRF closed.
 */
export async function safeOutboundFetch(
  rawUrl: string,
  init?: RequestInit,
): Promise<Response> {
  const url = requireSafeOutboundUrl(rawUrl);
  return fetch(url.href, {
    ...init,
    redirect: "error",
  });
}
