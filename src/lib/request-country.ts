import "server-only";
import { headers } from "next/headers";
import { geoFromRequestHeaders } from "@/modules/marketing/attribution/ua-geo";

/**
 * Country of the current request, from CDN/edge geo headers only.
 * Used to preselect the phone country for new/empty forms. Never persists IPs.
 */
export async function getSessionCountryCode(): Promise<string | null> {
  try {
    const country = geoFromRequestHeaders(await headers()).country;
    const code = country?.trim().slice(0, 2).toUpperCase();
    return code && /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}
