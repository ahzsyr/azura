import {
  type IndexNowPayloadConfig,
  resolveIndexNowCanonicalOrigin,
  resolveIndexNowPublicOrigin,
  wwwApexTwinOrigins,
} from "./indexnow-payload";
import { parsePreferredSiteUrl } from "@/lib/preferred-host";

export type IndexNowOriginFetch = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "text">>;

const PROBE_TTL_MS = 5 * 60_000;
const probeCache = new Map<string, { origin: string; expiresAt: number }>();

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function keyFileMatches(body: string, key: string): boolean {
  const firstLine = body.replace(/^\uFEFF/, "").trim().split(/\r?\n/)[0]?.trim() ?? "";
  return firstLine === key;
}

export function clearIndexNowProbeCacheForTests() {
  probeCache.clear();
}

/**
 * Pick the host that actually serves the IndexNow key (HTTP 200) instead of a
 * www/apex 308. Never return the redirecting twin of NEXT_PUBLIC_SITE_URL —
 * internal fetches on Hostinger can 200 on www while Bing still follows the
 * public 308 and then rejects those URLs.
 */
export async function probeIndexNowVerifiedOrigin(input: {
  pageUrl: string;
  config: IndexNowPayloadConfig;
  preferredOrigin?: string;
  fetchImpl?: IndexNowOriginFetch;
  now?: number;
}): Promise<string> {
  const fallback = resolveIndexNowCanonicalOrigin(input.pageUrl, input.config, input.preferredOrigin);
  const key = input.config.apiKey?.trim() ?? "";
  if (!key) return fallback;

  const publicOrigin = resolveIndexNowPublicOrigin(input.pageUrl, input.config, input.preferredOrigin);
  const cacheKey = `${key}:${fallback}:${publicOrigin ?? ""}`;
  const now = input.now ?? Date.now();
  const cached = probeCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.origin;

  const preferredPublic = parsePreferredSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)?.origin ?? null;
  const blockedTwins = new Set(
    preferredPublic
      ? wwwApexTwinOrigins(preferredPublic).filter((origin) => origin !== preferredPublic)
      : [],
  );

  const originCandidates = [fallback, publicOrigin]
    .filter((origin): origin is string => Boolean(origin))
    .concat(
      wwwApexTwinOrigins(fallback),
      wwwApexTwinOrigins(input.preferredOrigin ?? ""),
      wwwApexTwinOrigins(input.config.keyLocation ?? ""),
    );

  const origins = [...new Set(originCandidates.filter((origin) => !blockedTwins.has(origin)))];

  const fetchFn: IndexNowOriginFetch = input.fetchImpl ?? fetch;
  for (const origin of origins) {
    const url = `${origin.replace(/\/$/, "")}/${key}.txt`;
    try {
      const response = await fetchFn(url, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: { accept: "text/plain, */*" },
        signal: AbortSignal.timeout(4000),
      });
      if (isRedirectStatus(response.status) || !response.ok) continue;
      const body = await response.text();
      if (!keyFileMatches(body, key)) continue;
      probeCache.set(cacheKey, { origin, expiresAt: now + PROBE_TTL_MS });
      return origin;
    } catch {
      // try the next host
    }
  }

  return fallback;
}
