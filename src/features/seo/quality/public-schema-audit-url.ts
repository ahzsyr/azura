export type NormalizedAuditUrl = {
  url: string;
  pathname: string;
  hostname: string;
};

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function buildAllowedHosts(siteOrigin: string, extraHosts: string[] = []): Set<string> {
  const hosts = new Set<string>();
  try {
    const parsed = new URL(siteOrigin);
    hosts.add(normalizeHostname(parsed.hostname));
    if (parsed.hostname.startsWith("www.")) {
      hosts.add(normalizeHostname(parsed.hostname.slice(4)));
    } else {
      hosts.add(normalizeHostname(`www.${parsed.hostname}`));
    }
  } catch {
    // ignore
  }
  for (const host of extraHosts) {
    const trimmed = host.trim();
    if (trimmed) hosts.add(normalizeHostname(trimmed));
  }
  return hosts;
}

export function normalizeAuditUrlWithOrigin(
  input: string,
  siteOrigin: string,
  allowedHosts: Set<string>,
): NormalizedAuditUrl | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "URL is required." };

  const origin = siteOrigin.replace(/\/$/, "");
  let url: URL;

  try {
    if (trimmed.startsWith("/")) {
      url = new URL(trimmed, `${origin}/`);
    } else {
      url = new URL(trimmed);
    }
  } catch {
    return { error: "Invalid URL." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { error: "Only http(s) URLs are allowed." };
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || isPrivateIpv4(hostname)) {
    return { error: "Blocked host." };
  }

  if (!allowedHosts.has(normalizeHostname(hostname))) {
    return { error: `Host not allowed: ${hostname}` };
  }

  return {
    url: url.toString().replace(/\/$/, "") || url.toString(),
    pathname: url.pathname || "/",
    hostname,
  };
}
