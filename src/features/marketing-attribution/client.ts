/**
 * Client-side marketing attribution capture.
 * Anonymous visitor/session tokens only — no PII.
 *
 * Critical rule: after first landing with campaign=, attribution persists in
 * localStorage/session state. Later pages do not need ?campaign= on the URL.
 * Short links (/a?id) set a one-shot cookie and redirect to a clean path.
 */

import {
  CAMPAIGN_ENTRY_COOKIE,
  decodeCampaignEntryCookie,
  resolveCampaignParamFromSearchParams,
  type CampaignEntryPayload,
} from "@/modules/marketing/tracking-urls/build-url";

export type MarketingConsentStatus = "UNKNOWN" | "GRANTED" | "DENIED" | "WITHDRAWN";

export type AttributionSnapshot = {
  visitorToken: string;
  sessionToken: string;
  consentStatus: MarketingConsentStatus;
  /** Canonical first-party campaign param (campaign= / a= / utm_campaign) */
  campaignParam?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  clickIdType?: "GCLID" | "FBCLID" | "MSCLKID" | "LI_FAT_ID" | "OTHER";
  clickId?: string;
  landingPagePath?: string;
  referrer?: string;
  entryUrl?: string;
};

const VISITOR_KEY = "mkt_visitor";
const SESSION_KEY = "mkt_session";
const CONSENT_KEY = "mkt_consent";
const ATTR_KEY = "mkt_attr";
const SESSION_MS = 30 * 60 * 1000;

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Read + clear one-shot campaign entry cookie set by /a short-link redirect.
 * Keeps the browser URL clean while still attributing the visit.
 */
export function consumePendingCampaignEntry(): CampaignEntryPayload | null {
  if (typeof window === "undefined") return null;
  const raw = readCookie(CAMPAIGN_ENTRY_COOKIE);
  let payload = decodeCampaignEntryCookie(raw);
  if (!payload && raw) {
    try {
      const parsed = JSON.parse(raw) as CampaignEntryPayload;
      if (parsed?.campaignParam?.trim()) payload = parsed;
    } catch {
      /* ignore */
    }
  }
  if (payload) clearCookie(CAMPAIGN_ENTRY_COOKIE);
  return payload;
}

export function getMarketingConsent(): MarketingConsentStatus {
  if (typeof window === "undefined") return "UNKNOWN";
  const fromStorage = localStorage.getItem(CONSENT_KEY) as MarketingConsentStatus | null;
  if (fromStorage) return fromStorage;
  return "UNKNOWN";
}

export function setMarketingConsent(status: MarketingConsentStatus) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, status);
  writeCookie(CONSENT_KEY, status, 365);
}

function parseClickId(params: URLSearchParams): {
  clickIdType?: AttributionSnapshot["clickIdType"];
  clickId?: string;
} {
  if (params.get("gclid")) return { clickIdType: "GCLID", clickId: params.get("gclid")! };
  if (params.get("fbclid")) return { clickIdType: "FBCLID", clickId: params.get("fbclid")! };
  if (params.get("msclkid")) return { clickIdType: "MSCLKID", clickId: params.get("msclkid")! };
  if (params.get("li_fat_id")) return { clickIdType: "LI_FAT_ID", clickId: params.get("li_fat_id")! };
  return {};
}

/** True when URL has a campaign param or paid click id that can start a new touch. */
export function urlHasCampaignEntry(
  params: URLSearchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  ),
): boolean {
  if (resolveCampaignParamFromSearchParams(params)) return true;
  if (params.get("utm_source") || params.get("utm_medium") || params.get("utm_content") || params.get("utm_term")) {
    return true;
  }
  return Boolean(params.get("gclid") || params.get("fbclid") || params.get("msclkid") || params.get("li_fat_id"));
}

/**
 * Whether this URL represents a genuinely new campaign/click entry vs stored first-touch.
 */
export function isGenuineNewCampaignEntry(
  params: URLSearchParams,
  prev: AttributionSnapshot | null,
  pendingEntry?: CampaignEntryPayload | null,
): boolean {
  if (pendingEntry?.campaignParam) {
    if (!prev?.campaignParam && !prev?.utmCampaign) return true;
    return pendingEntry.campaignParam !== (prev.campaignParam || prev.utmCampaign);
  }
  if (!urlHasCampaignEntry(params)) return false;
  if (!prev?.campaignParam && !prev?.utmCampaign && !prev?.clickId) return true;

  const nextCampaign = resolveCampaignParamFromSearchParams(params);
  const nextClick = parseClickId(params);
  if (nextCampaign && nextCampaign !== (prev.campaignParam || prev.utmCampaign)) return true;
  if (nextClick.clickId && nextClick.clickId !== prev.clickId) return true;
  return false;
}

/**
 * Pure merge used by getOrCreateAttributionSnapshot (also unit-tested).
 * First-touch lock: without a genuine new entry, never overwrite landing/entry/referrer/campaign/UTMs.
 */
export function mergeAttributionSnapshot(
  prev: AttributionSnapshot | null,
  current: Omit<AttributionSnapshot, "visitorToken" | "sessionToken" | "consentStatus"> & {
    visitorToken: string;
    sessionToken: string;
    consentStatus: MarketingConsentStatus;
  },
  opts: { hasGenuineNewEntry: boolean; urlHasAnyEntryParams: boolean },
): AttributionSnapshot {
  if (!prev) return current;

  if (!opts.urlHasAnyEntryParams || !opts.hasGenuineNewEntry) {
    return {
      ...prev,
      visitorToken: current.visitorToken,
      sessionToken: current.sessionToken,
      consentStatus: current.consentStatus,
    };
  }

  return {
    ...prev,
    visitorToken: current.visitorToken,
    sessionToken: current.sessionToken,
    consentStatus: current.consentStatus,
    campaignParam: current.campaignParam || prev.campaignParam,
    utmSource: current.utmSource || prev.utmSource,
    utmMedium: current.utmMedium || prev.utmMedium,
    utmCampaign: current.utmCampaign || prev.utmCampaign,
    utmContent: current.utmContent || prev.utmContent,
    utmTerm: current.utmTerm || prev.utmTerm,
    clickIdType: current.clickIdType || prev.clickIdType,
    clickId: current.clickId || prev.clickId,
    landingPagePath: prev.landingPagePath,
    entryUrl: prev.entryUrl,
    referrer: prev.referrer,
  };
}

export function getOrCreateAttributionSnapshot(
  opts?: { pendingEntry?: CampaignEntryPayload | null },
): AttributionSnapshot | null {
  if (typeof window === "undefined") return null;
  const consentStatus = getMarketingConsent();
  if (consentStatus === "DENIED" || consentStatus === "WITHDRAWN") return null;

  let visitorToken = localStorage.getItem(VISITOR_KEY) || readCookie(VISITOR_KEY);
  if (!visitorToken) {
    visitorToken = randomToken();
    localStorage.setItem(VISITOR_KEY, visitorToken);
    writeCookie(VISITOR_KEY, visitorToken, 365);
  }

  const sessionRaw = sessionStorage.getItem(SESSION_KEY);
  let sessionToken: string;
  let sessionTs: number;
  if (sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw) as { token: string; ts: number };
      if (Date.now() - parsed.ts < SESSION_MS) {
        sessionToken = parsed.token;
        sessionTs = Date.now();
      } else {
        sessionToken = randomToken();
        sessionTs = Date.now();
      }
    } catch {
      sessionToken = randomToken();
      sessionTs = Date.now();
    }
  } else {
    sessionToken = randomToken();
    sessionTs = Date.now();
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: sessionToken, ts: sessionTs }));

  const pending =
    opts && "pendingEntry" in opts ? (opts.pendingEntry ?? null) : consumePendingCampaignEntry();

  const params = new URLSearchParams(window.location.search);
  const click = parseClickId(params);
  const urlCampaign = resolveCampaignParamFromSearchParams(params) ?? undefined;
  const campaignParam = urlCampaign || pending?.campaignParam || undefined;

  const current: AttributionSnapshot = {
    visitorToken,
    sessionToken,
    consentStatus,
    campaignParam,
    utmSource: params.get("utm_source") ?? pending?.utmSource ?? undefined,
    utmMedium: params.get("utm_medium") ?? pending?.utmMedium ?? undefined,
    utmCampaign:
      params.get("utm_campaign") ?? pending?.utmCampaign ?? campaignParam ?? undefined,
    utmContent: params.get("utm_content") ?? pending?.utmContent ?? undefined,
    utmTerm: params.get("utm_term") ?? pending?.utmTerm ?? undefined,
    ...click,
    landingPagePath: pending?.landingPagePath || window.location.pathname,
    referrer: document.referrer || undefined,
    entryUrl: pending?.entryUrl || window.location.href,
  };

  let prev: AttributionSnapshot | null = null;
  const existing = localStorage.getItem(ATTR_KEY);
  if (existing) {
    try {
      prev = JSON.parse(existing) as AttributionSnapshot;
    } catch {
      prev = null;
    }
  }

  const urlHasAnyEntryParams = Boolean(pending?.campaignParam) || urlHasCampaignEntry(params);
  const hasGenuineNewEntry = isGenuineNewCampaignEntry(params, prev, pending);
  const merged = mergeAttributionSnapshot(prev, current, {
    hasGenuineNewEntry,
    urlHasAnyEntryParams,
  });

  localStorage.setItem(ATTR_KEY, JSON.stringify(merged));
  return merged;
}

export function getStoredAttribution(): AttributionSnapshot | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ATTR_KEY);
  if (!raw) return getOrCreateAttributionSnapshot();
  try {
    return JSON.parse(raw) as AttributionSnapshot;
  } catch {
    return getOrCreateAttributionSnapshot();
  }
}

/**
 * Capture attribution to server.
 * forceTouch=true creates/records a MarketingTouch; false only bumps visitor/session activity.
 */
export async function captureAttributionToServer(
  snapshot?: AttributionSnapshot | null,
  opts?: { forceTouch?: boolean },
) {
  const data = snapshot ?? getOrCreateAttributionSnapshot();
  if (!data) return null;

  const createTouch = opts?.forceTouch !== false;

  const res = await fetch("/api/marketing/attribution/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...data,
      campaignParam: data.campaignParam,
      createTouch,
      clientOccurredAt: new Date().toISOString(),
    }),
    keepalive: true,
  });
  if (!res.ok) return null;
  return res.json();
}

export async function trackMarketingEvent(
  name: string,
  properties?: Record<string, unknown>,
  opts?: { idempotencyKey?: string },
) {
  const attr = getStoredAttribution();
  const idempotencyKey =
    opts?.idempotencyKey ?? `evt:${name}:${attr?.sessionToken ?? "anon"}:${Date.now()}`;

  await fetch("/api/marketing/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      idempotencyKey,
      eventId: crypto.randomUUID?.() ?? idempotencyKey,
      properties,
      clientOccurredAt: new Date().toISOString(),
      visitorToken: attr?.visitorToken,
      sessionToken: attr?.sessionToken,
      landingPagePath: typeof window !== "undefined" ? window.location.pathname : undefined,
      campaignParam: attr?.campaignParam,
      utmSource: attr?.utmSource,
      utmMedium: attr?.utmMedium,
      utmCampaign: attr?.utmCampaign ?? attr?.campaignParam,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

export function attributionToUtmRecord(attr: AttributionSnapshot | null): Record<string, string> {
  if (!attr) return {};
  const out: Record<string, string> = {};
  if (attr.campaignParam) out.campaign = attr.campaignParam;
  if (attr.utmSource) out.utm_source = attr.utmSource;
  if (attr.utmMedium) out.utm_medium = attr.utmMedium;
  if (attr.utmCampaign || attr.campaignParam) {
    out.utm_campaign = attr.utmCampaign || attr.campaignParam!;
  }
  if (attr.utmContent) out.utm_content = attr.utmContent;
  if (attr.utmTerm) out.utm_term = attr.utmTerm;
  if (attr.clickIdType) out.click_id_type = attr.clickIdType;
  if (attr.clickId) out.click_id = attr.clickId;
  if (attr.visitorToken) out.visitor_token = attr.visitorToken;
  if (attr.sessionToken) out.session_token = attr.sessionToken;
  if (attr.landingPagePath) out.landing_page = attr.landingPagePath;
  if (attr.referrer) out.referrer = attr.referrer;
  return out;
}
