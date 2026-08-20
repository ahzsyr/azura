import { normalizeWiredCmsAbsoluteUrl } from "@/features/cms/cms-page-path";
import { alignUrlToPreferredOrigin, parsePreferredSiteUrl } from "@/lib/preferred-host";

export type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

export type IndexNowPayloadConfig = {
  apiKey?: string;
  keyLocation?: string;
  siteUrl?: string;
  endpoint?: string;
};

function tryOrigin(raw: string | undefined): string | null {
  return parsePreferredSiteUrl(raw)?.origin ?? null;
}

function registrableHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isLocalOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1";
  } catch {
    return true;
  }
}

export function wwwApexTwinOrigins(origin: string): string[] {
  const parsed = parsePreferredSiteUrl(origin);
  if (!parsed) return [];
  const protocol = new URL(parsed.origin).protocol;
  const apex = parsed.hostname.replace(/^www\./, "");
  const www = parsed.hostname.startsWith("www.") ? parsed.hostname : `www.${parsed.hostname}`;
  return [...new Set([`${protocol}//${apex}`, `${protocol}//${www}`])];
}

/** Public origin the site consolidates to (NEXT_PUBLIC_SITE_URL), when it is this same site. */
export function resolveIndexNowPublicOrigin(
  pageUrl: string,
  config: IndexNowPayloadConfig,
  preferredOrigin?: string,
): string | null {
  const pageOrigin = tryOrigin(pageUrl);
  const twins = pageOrigin ? wwwApexTwinOrigins(pageOrigin) : [];
  const isTwin = (origin: string | null): origin is string => Boolean(origin && twins.includes(origin));

  for (const candidate of [
    process.env.NEXT_PUBLIC_SITE_URL,
    preferredOrigin,
    config.siteUrl,
  ]) {
    const origin = tryOrigin(candidate);
    if (isTwin(origin)) return origin;
  }
  return pageOrigin && !isLocalOrigin(pageOrigin) ? pageOrigin : null;
}

/**
 * Host that must appear on keyLocation + urlList.
 *
 * IndexNow follows redirects on the key file, then rejects urlList hosts that do
 * not match the *verified* (final) host. www.brt-me.com 308s to brt-me.com, so we
 * must never submit the redirecting twin — even if an internal probe sees HTTP 200
 * on www (Hostinger loopback bypasses Cloudflare).
 */
export function resolveIndexNowCanonicalOrigin(
  pageUrl: string,
  config: IndexNowPayloadConfig,
  verifiedOrigin?: string,
): string {
  const pageOrigin = tryOrigin(pageUrl);
  const publicOrigin = resolveIndexNowPublicOrigin(pageUrl, config, verifiedOrigin);
  if (publicOrigin) return publicOrigin;

  const verified = tryOrigin(verifiedOrigin);
  if (verified && pageOrigin && wwwApexTwinOrigins(pageOrigin).includes(verified)) {
    return verified;
  }
  if (pageOrigin && !isLocalOrigin(pageOrigin)) return pageOrigin;

  for (const candidate of [verifiedOrigin, config.siteUrl, process.env.NEXT_PUBLIC_SITE_URL, config.keyLocation]) {
    const origin = tryOrigin(candidate);
    if (origin && !isLocalOrigin(origin)) return origin;
  }
  return pageOrigin || "https://localhost";
}

/** IndexNow requires the file to be named {key}.txt on the submission host (root). */
export function indexNowKeyFileUrl(origin: string, key: string): string {
  const trimmedKey = key.trim();
  return `${origin.replace(/\/$/, "")}/${trimmedKey}.txt`;
}

function isIndexNowCompliantKeyLocation(url: string, origin: string, key: string): boolean {
  if (!key.trim()) return false;
  try {
    const loc = new URL(url);
    const originUrl = new URL(origin);
    if (registrableHost(loc.hostname) !== registrableHost(originUrl.hostname)) return false;
    const pathname = loc.pathname.replace(/\/$/, "") || "/";
    return pathname === `/${key.trim()}.txt`;
  } catch {
    return false;
  }
}

/** Same-site key files always live at /{key}.txt. Uploaded documents and off-site URLs are ignored. */
export function resolveIndexNowKeyLocation(
  configured: string | undefined,
  origin: string,
  key: string,
): string {
  const fallback = indexNowKeyFileUrl(origin, key);
  const trimmed = configured?.trim();
  if (!trimmed || !key.trim()) return fallback;
  try {
    const loc = new URL(trimmed.startsWith("http") ? trimmed : `${origin.replace(/\/$/, "")}/${trimmed.replace(/^\//, "")}`);
    loc.protocol = new URL(origin).protocol;
    loc.host = new URL(origin).host;
    loc.hash = "";
    loc.search = "";
    const aligned = loc.toString().replace(/\/$/, "");
    return isIndexNowCompliantKeyLocation(aligned, origin, key) ? aligned : fallback;
  } catch {
    return fallback;
  }
}

/** Rewrite saved IndexNow host/keyLocation onto the public non-redirecting origin. */
export function alignIndexNowStoredConfig<T extends IndexNowPayloadConfig>(
  config: T,
  publicOrigin?: string,
): T {
  const origin =
    tryOrigin(publicOrigin) ?? tryOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? tryOrigin(config.siteUrl);
  if (!origin) return config;

  const next: T = { ...config };
  const siteOrigin = tryOrigin(config.siteUrl);
  if (siteOrigin && wwwApexTwinOrigins(origin).includes(siteOrigin)) {
    next.siteUrl = origin;
  }
  const key = config.apiKey?.trim() ?? "";
  if (key) {
    next.keyLocation = resolveIndexNowKeyLocation(config.keyLocation, origin, key);
  } else {
    const keyOrigin = tryOrigin(config.keyLocation);
    if (keyOrigin && wwwApexTwinOrigins(origin).includes(keyOrigin) && config.keyLocation) {
      next.keyLocation = alignUrlToPreferredOrigin(config.keyLocation, origin);
    }
  }
  return next;
}

export function isIndexNowHostMismatchError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalidrequestparameters") ||
    lower.includes("not related to your site") ||
    lower.includes("keylocation")
  );
}

/**
 * IndexNow fetches `keyLocation`, follows www/apex redirects, then rejects urlList
 * hosts that do not match that verified site (`InvalidRequestParameters`).
 */
export function buildIndexNowPayload(
  config: IndexNowPayloadConfig,
  pageUrl: string,
  preferredOrigin?: string,
): IndexNowPayload {
  return buildIndexNowBatchPayload(config, [pageUrl], preferredOrigin);
}

export function buildIndexNowBatchPayload(
  config: IndexNowPayloadConfig,
  pageUrls: string[],
  preferredOrigin?: string,
): IndexNowPayload {
  const normalizedUrls = pageUrls
    .map((pageUrl) => normalizeWiredCmsAbsoluteUrl(pageUrl))
    .filter(Boolean);
  const seed = normalizedUrls[0] ?? config.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const canonicalOrigin = resolveIndexNowCanonicalOrigin(seed, config, preferredOrigin);
  const urlList = [
    ...new Set(
      normalizedUrls.map((pageUrl) => alignUrlToPreferredOrigin(pageUrl, canonicalOrigin)),
    ),
  ];
  const parsed = new URL(urlList[0] ?? alignUrlToPreferredOrigin(seed, canonicalOrigin));
  const key = config.apiKey?.trim() ?? "";
  return {
    host: parsed.hostname,
    key,
    keyLocation: resolveIndexNowKeyLocation(config.keyLocation, parsed.origin, key),
    urlList,
  };
}
