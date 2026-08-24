/**
 * Client-side marketing attribution capture.
 * Anonymous visitor/session tokens only — no PII.
 */

export type MarketingConsentStatus = "UNKNOWN" | "GRANTED" | "DENIED" | "WITHDRAWN";

export type AttributionSnapshot = {
  visitorToken: string;
  sessionToken: string;
  consentStatus: MarketingConsentStatus;
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

export function getOrCreateAttributionSnapshot(): AttributionSnapshot | null {
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

  const params = new URLSearchParams(window.location.search);
  const click = parseClickId(params);
  const snapshot: AttributionSnapshot = {
    visitorToken,
    sessionToken,
    consentStatus,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
    ...click,
    landingPagePath: window.location.pathname,
    referrer: document.referrer || undefined,
    entryUrl: window.location.href,
  };

  // Persist last-touch attribution for form submits
  const existing = localStorage.getItem(ATTR_KEY);
  let merged = snapshot;
  if (existing) {
    try {
      const prev = JSON.parse(existing) as AttributionSnapshot;
      merged = {
        ...prev,
        ...snapshot,
        // keep first-touch UTMs if new visit has none
        utmSource: snapshot.utmSource || prev.utmSource,
        utmMedium: snapshot.utmMedium || prev.utmMedium,
        utmCampaign: snapshot.utmCampaign || prev.utmCampaign,
        utmContent: snapshot.utmContent || prev.utmContent,
        utmTerm: snapshot.utmTerm || prev.utmTerm,
        clickIdType: snapshot.clickIdType || prev.clickIdType,
        clickId: snapshot.clickId || prev.clickId,
        visitorToken,
        sessionToken,
        consentStatus,
      };
    } catch {
      merged = snapshot;
    }
  }
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

export async function captureAttributionToServer(snapshot?: AttributionSnapshot | null) {
  const data = snapshot ?? getOrCreateAttributionSnapshot();
  if (!data) return null;

  const res = await fetch("/api/marketing/attribution/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...data,
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
      browser: navigator.userAgent.slice(0, 64),
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
      utmSource: attr?.utmSource,
      utmMedium: attr?.utmMedium,
      utmCampaign: attr?.utmCampaign,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

export function attributionToUtmRecord(attr: AttributionSnapshot | null): Record<string, string> {
  if (!attr) return {};
  const out: Record<string, string> = {};
  if (attr.utmSource) out.utm_source = attr.utmSource;
  if (attr.utmMedium) out.utm_medium = attr.utmMedium;
  if (attr.utmCampaign) out.utm_campaign = attr.utmCampaign;
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
