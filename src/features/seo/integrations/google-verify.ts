import "server-only";
import { normalizeGa4PropertyId } from "@/features/seo/admin/google-integration-readiness";
import { gscSiteUrlsMatch, normalizeGscSiteUrl, resolveGscSiteUrl } from "@/features/seo/admin/google-gsc-site-url";
import type { SeoIntegrationProviderConfig } from "@/features/seo/types";
import { refreshGoogleToken } from "./google-auth";

export type GoogleIntegrationVerification = {
  gscSiteAccessible: boolean;
  matchedGscSiteUrl?: string;
  gscError?: string;
  availableGscSites?: string[];
  ga4Accessible?: boolean;
  ga4Error?: string;
};

export type GoogleIntegrationVerifyOptions = {
  timeoutMs?: number;
};

const GOOGLE_VERIFY_TIMEOUT = "GOOGLE_VERIFY_TIMEOUT";

async function listGscSites(token: string): Promise<string[]> {
  const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const body = (await response.json()) as { siteEntry?: Array<{ siteUrl?: string }> };
  return (body.siteEntry ?? []).map((entry) => entry.siteUrl?.trim()).filter(Boolean) as string[];
}

export async function resolveConfiguredGscSiteUrl(
  config: SeoIntegrationProviderConfig,
  token: string,
): Promise<string> {
  const configured = normalizeGscSiteUrl(config.siteUrl ?? "");
  if (!configured) return configured;
  const sites = await listGscSites(token);
  return resolveGscSiteUrl(configured, sites) ?? configured;
}

async function verifyGa4Access(token: string, propertyId: string): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "sessions" }],
        limit: 1,
      }),
      cache: "no-store",
    },
  );
  if (response.ok) return { ok: true };
  return { ok: false, error: await response.text() };
}

async function verifyGoogleIntegrationAccessInner(
  config: SeoIntegrationProviderConfig,
): Promise<GoogleIntegrationVerification> {
  const siteUrl = normalizeGscSiteUrl(config.siteUrl ?? "");
  if (!config.bearerToken?.trim() && !config.refreshToken) {
    return { gscSiteAccessible: false, gscError: "OAuth bearer token not set" };
  }

  let token: string | undefined;
  try {
    token = (await refreshGoogleToken(config))?.trim();
  } catch (error) {
    return {
      gscSiteAccessible: false,
      gscError: error instanceof Error ? error.message : String(error),
    };
  }
  if (!token) {
    return { gscSiteAccessible: false, gscError: "OAuth bearer token not available" };
  }

  if (!siteUrl) {
    return { gscSiteAccessible: false, gscError: "Search Console site URL not set" };
  }

  let availableGscSites: string[];
  try {
    availableGscSites = await listGscSites(token);
  } catch (error) {
    return {
      gscSiteAccessible: false,
      gscError: error instanceof Error ? error.message : String(error),
    };
  }

  const matchedGscSiteUrl = resolveGscSiteUrl(siteUrl, availableGscSites);
  if (!matchedGscSiteUrl) {
    return {
      gscSiteAccessible: false,
      gscError: "Site URL not found in your Search Console properties",
      availableGscSites: availableGscSites.slice(0, 8),
    };
  }

  const result: GoogleIntegrationVerification = {
    gscSiteAccessible: true,
    matchedGscSiteUrl,
  };

  const propertyId = normalizeGa4PropertyId(config.ga4PropertyId);
  if (config.analyticsEnabled && propertyId) {
    const ga4 = await verifyGa4Access(token, propertyId);
    result.ga4Accessible = ga4.ok;
    if (!ga4.ok) result.ga4Error = ga4.error;
  }

  return result;
}

export async function verifyGoogleIntegrationAccess(
  config: SeoIntegrationProviderConfig,
  options?: GoogleIntegrationVerifyOptions,
): Promise<GoogleIntegrationVerification> {
  const timeoutMs = options?.timeoutMs ?? 0;
  if (timeoutMs <= 0) {
    return verifyGoogleIntegrationAccessInner(config);
  }

  return new Promise<GoogleIntegrationVerification>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(GOOGLE_VERIFY_TIMEOUT)), timeoutMs);
    verifyGoogleIntegrationAccessInner(config)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export { gscSiteUrlsMatch };
