/**
 * Lightweight UA parsing for marketing session device fields.
 * No third-party dependency — best-effort labels only.
 */

export function parseUserAgent(ua: string | null | undefined): {
  deviceType: string;
  browser: string;
  os: string;
} {
  const s = (ua ?? "").trim();
  if (!s) {
    return { deviceType: "unknown", browser: "unknown", os: "unknown" };
  }

  const deviceType = /iPad|Tablet/i.test(s)
    ? "tablet"
    : /Mobi|Android.*Mobile|iPhone|iPod/i.test(s)
      ? "mobile"
      : "desktop";

  let browser = "other";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/Chrome\//i.test(s) && !/Edg\//i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s) && !/Chrome\//i.test(s)) browser = "Safari";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/MSIE|Trident\//i.test(s)) browser = "IE";

  let os = "other";
  if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Windows NT/i.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/CrOS/i.test(s)) os = "ChromeOS";
  else if (/Linux/i.test(s)) os = "Linux";

  return { deviceType, browser, os };
}

/** Geo from CDN / edge headers only — never persist raw IP. */
export function geoFromRequestHeaders(headers: Headers): {
  country?: string;
  region?: string;
} {
  const country =
    headers.get("cf-ipcountry") ||
    headers.get("x-vercel-ip-country") ||
    headers.get("x-country-code") ||
    null;
  const region =
    headers.get("x-vercel-ip-country-region") ||
    headers.get("cf-region") ||
    headers.get("x-region-code") ||
    null;
  return {
    ...(country && country !== "XX" ? { country: country.slice(0, 64) } : {}),
    ...(region ? { region: region.slice(0, 64) } : {}),
  };
}
