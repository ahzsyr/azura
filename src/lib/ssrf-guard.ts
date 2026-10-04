import { isIP } from "node:net";
import { promises as dns } from "node:dns";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "metadata",
]);

export function isPrivateOrReservedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata 169.254.169.254
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
 * Synchronous hostname/IP checks (no DNS). Prefer validateWebhookDestination for delivery.
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

/**
 * Validate webhook destination after DNS resolution (A + AAAA).
 * Rejects private/reserved/metadata ranges. Prefer allowlist via WEBHOOK_ENDPOINTS only.
 */
export async function validateWebhookDestination(targetUrl: string): Promise<URL> {
  const sync = assertSafeOutboundUrl(targetUrl);
  if (!sync.ok) throw new Error(`SSRF blocked: ${sync.reason}`);
  const parsedUrl = sync.url;
  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, "");

  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error(`Forbidden target IP: ${hostname}`);
    }
    return parsedUrl;
  }

  const addresses = new Set<string>();
  try {
    for (const a of await dns.resolve4(hostname)) addresses.add(a);
  } catch {
    /* may be IPv6-only */
  }
  try {
    for (const a of await dns.resolve6(hostname)) addresses.add(a);
  } catch {
    /* may be IPv4-only */
  }

  if (addresses.size === 0) {
    throw new Error(`SSRF blocked: DNS resolution failed for ${hostname}`);
  }

  for (const ip of addresses) {
    if (isPrivateOrReservedIp(ip)) {
      throw new Error(`Forbidden target IP: ${ip}`);
    }
  }

  return parsedUrl;
}

/** Throws if URL is unsafe (sync hostname checks only). */
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
  const url = await validateWebhookDestination(rawUrl);
  return fetch(url.href, {
    ...init,
    redirect: "error",
  });
}
