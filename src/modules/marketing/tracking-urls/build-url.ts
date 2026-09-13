/**
 * Short share links and landing tracking URLs.
 *
 * Share form (what admins copy):  https://domain.com/a?campaign1
 * Redirects to a clean landing path (no query params). Attribution is passed
 * via first-party cookie mkt_camp_entry so the visitor's address bar stays clean.
 */

import { getFallbackDefaultLocalePrefix, publicLocalePath, stripAnyLocalePrefix } from "@/i18n/url-helpers";

/** Cookie set by /a short-link redirect; consumed once by the attribution client. */
export const CAMPAIGN_ENTRY_COOKIE = "mkt_camp_entry";

export type CampaignEntryPayload = {
  campaignParam: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  /** Original short link the visitor clicked */
  entryUrl?: string;
  landingPagePath?: string;
};

function isUnusableTrackingHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "0.0.0.0" || host === "::" || host === "[::]";
}

/** Sync site origin for tracking URL generation (no request context). */
export function getTrackingSiteOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
  ];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      const origin = new URL(trimmed.replace(/\/$/, "") || trimmed).origin;
      if (!isUnusableTrackingHost(new URL(origin).hostname)) {
        return origin;
      }
    } catch {
      /* try next */
    }
  }
  return "http://localhost:3000";
}

/**
 * Short shareable campaign link: {origin}/a?{identifier}
 * Example: https://brt-me.com/a?test
 */
export function buildShortShareUrl(input: {
  campaignParam: string;
  siteOrigin?: string | null;
}): string {
  const origin = (input.siteOrigin ?? getTrackingSiteOrigin()).replace(/\/$/, "");
  const id = encodeURIComponent(input.campaignParam.trim());
  return `${origin}/a?${id}`;
}

/**
 * Clean landing destination (no tracking query params) — what the visitor sees.
 * Example: https://brt-me.com/products
 */
export function buildCleanLandingUrl(input: {
  baseUrl: string;
  siteOrigin?: string | null;
  localePrefix?: string | null;
}): string {
  const origin = (input.siteOrigin ?? "").replace(/\/$/, "") || "https://placeholder.local";
  let path = input.baseUrl.trim() || "/";
  if (!/^https?:\/\//i.test(path)) {
    if (!path.startsWith("/")) path = `/${path}`;
    const locale = input.localePrefix?.replace(/^\/|\/$/g, "");
    if (locale) {
      const defaultPrefix = getFallbackDefaultLocalePrefix();
      const neutral = stripAnyLocalePrefix(path, [locale, defaultPrefix]);
      path = publicLocalePath(locale, neutral, defaultPrefix);
    }
  }
  const url = new URL(path, origin.endsWith("/") ? origin : `${origin}/`);
  if (input.siteOrigin || /^https?:\/\//i.test(input.baseUrl)) {
    return `${url.origin}${url.pathname}`;
  }
  return url.pathname;
}

/**
 * Parse campaign identifier from a short-link request.
 * Supports: /a?test | /a?a=test | /a?campaign=test | /a/test
 */
export function parseShortCampaignId(input: {
  pathname: string;
  searchParams: URLSearchParams;
}): string | null {
  const path = input.pathname.replace(/\/+$/, "") || "/";
  const pathMatch = path.match(/^\/a\/([^/]+)$/i);
  if (pathMatch?.[1]) {
    try {
      return decodeURIComponent(pathMatch[1]).trim() || null;
    } catch {
      return pathMatch[1].trim() || null;
    }
  }

  const fromA = input.searchParams.get("a")?.trim();
  if (fromA) return fromA;
  const fromCampaign = input.searchParams.get("campaign")?.trim();
  if (fromCampaign) return fromCampaign;

  // Bare form: /a?test  → first query key with empty value
  for (const [key, value] of input.searchParams.entries()) {
    if (key && (!value || value === "")) {
      try {
        return decodeURIComponent(key).trim() || null;
      } catch {
        return key.trim() || null;
      }
    }
  }

  const first = [...input.searchParams.keys()][0];
  return first?.trim() || null;
}

export function encodeCampaignEntryCookie(payload: CampaignEntryPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeCampaignEntryCookie(raw: string | null | undefined): CampaignEntryPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CampaignEntryPayload;
    if (!parsed?.campaignParam?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Destination landing URL with attribution query params (internal / analytics use).
 * Prefer buildCleanLandingUrl + cookie for visitor-facing redirects.
 */
export function buildTrackingUrl(input: {
  baseUrl: string;
  campaignParam: string;
  siteOrigin?: string | null;
  localePrefix?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  /** When false, omit a= (default true) */
  includeShortParam?: boolean;
}) {
  const origin = (input.siteOrigin ?? "").replace(/\/$/, "") || "https://placeholder.local";
  let path = input.baseUrl.trim() || "/";
  if (!/^https?:\/\//i.test(path)) {
    if (!path.startsWith("/")) path = `/${path}`;
    const locale = input.localePrefix?.replace(/^\/|\/$/g, "");
    if (locale) {
      const defaultPrefix = getFallbackDefaultLocalePrefix();
      const neutral = stripAnyLocalePrefix(path, [locale, defaultPrefix]);
      path = publicLocalePath(locale, neutral, defaultPrefix);
    }
  }
  const url = new URL(path, origin.endsWith("/") ? origin : `${origin}/`);
  const campaignParam = input.campaignParam.trim();
  if (campaignParam) {
    if (input.includeShortParam !== false) {
      url.searchParams.set("a", campaignParam);
    }
    url.searchParams.set("campaign", campaignParam);
  }
  if (input.utmSource) url.searchParams.set("utm_source", input.utmSource);
  if (input.utmMedium) url.searchParams.set("utm_medium", input.utmMedium);
  const hasOptionalUtm = Boolean(input.utmSource || input.utmMedium || input.utmContent || input.utmTerm);
  const utmCampaign =
    input.utmCampaign?.trim() || (hasOptionalUtm ? campaignParam : null);
  if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
  if (input.utmContent) url.searchParams.set("utm_content", input.utmContent);
  if (input.utmTerm) url.searchParams.set("utm_term", input.utmTerm);

  if (input.siteOrigin || /^https?:\/\//i.test(input.baseUrl)) {
    return url.toString();
  }
  return `${url.pathname}${url.search}`;
}

/**
 * Resolve first-party campaign param from URL search params.
 * Order: campaign → a → utm_campaign
 */
export function resolveCampaignParamFromSearchParams(
  params: URLSearchParams | Record<string, string | null | undefined>,
): string | null {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      const v = params.get(key);
      return v?.trim() || null;
    }
    const v = params[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return get("campaign") || get("a") || get("utm_campaign") || null;
}

/** Resolve binding discriminator from URL (binding= or utm_content=binding_xxx). */
export function resolveBindingIdFromSearchParams(
  params: URLSearchParams | Record<string, string | null | undefined>,
): string | null {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      const v = params.get(key);
      return v?.trim() || null;
    }
    const v = params[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return get("binding") || get("utm_content") || null;
}

/**
 * Google Ads Final URL suffix for a binding.
 * Paste into Google Ads tracking template / final URL suffix.
 */
export function buildGoogleAdsFinalUrlSuffix(input: {
  internalId: string;
  bindingId: string;
}): string {
  const id = encodeURIComponent(input.internalId.trim());
  const binding = encodeURIComponent(input.bindingId.trim());
  return `{lpurl}?campaign=${id}&utm_source=google&utm_medium=cpc&utm_campaign=${id}&binding=${binding}`;
}
