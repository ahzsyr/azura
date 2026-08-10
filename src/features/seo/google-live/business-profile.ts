import "server-only";

import { seoRepository } from "@/repositories/seo.repository";
import { refreshGoogleToken } from "@/features/seo/integrations/google-auth";
import { getGooglePlatformState } from "@/features/seo/google-platform/persistence";

export type BusinessProfileSyncResult = {
  ok: true;
  live: true;
  synced: number;
  accountName?: string | null;
  locationNames: string[];
  configureHref: string;
  message: string;
};

async function resolveBusinessProfileToken(): Promise<string> {
  const platform = await getGooglePlatformState().catch(() => null);
  const fromPlatform = platform?.services?.business_profile?.configuration;
  const platformToken =
    (typeof fromPlatform?.accessToken === "string" && fromPlatform.accessToken.trim()) ||
    (typeof fromPlatform?.bearerToken === "string" && fromPlatform.bearerToken.trim()) ||
    null;
  if (platformToken) return platformToken;

  const integrations = await seoRepository.getIntegrationsConfig();
  const google = integrations.google;
  if (!google?.bearerToken?.trim()) {
    throw new Error(
      "Business Profile OAuth token not available. Connect Business Profile under Admin → SEO → Google.",
    );
  }
  const token = (await refreshGoogleToken(google))?.trim();
  if (!token) {
    throw new Error("Could not refresh Google OAuth token for Business Profile.");
  }
  return token;
}

export async function syncBusinessProfileLocations(): Promise<BusinessProfileSyncResult> {
  const token = await resolveBusinessProfileToken();

  const accountsResponse = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!accountsResponse.ok) {
    const body = await accountsResponse.text().catch(() => "");
    throw new Error(
      `Business Profile accounts failed (${accountsResponse.status}): ${
        body.slice(0, 300) || accountsResponse.statusText
      }. Ensure the OAuth token includes the business.manage scope.`,
    );
  }

  const accountsBody = (await accountsResponse.json()) as {
    accounts?: Array<{ name?: string; accountName?: string }>;
  };
  const accounts = accountsBody.accounts ?? [];
  if (accounts.length === 0) {
    return {
      ok: true,
      live: true,
      synced: 0,
      accountName: null,
      locationNames: [],
      configureHref: "/admin/seo/google?tab=business_profile",
      message: "No Business Profile accounts found for this credential.",
    };
  }

  const accountName = accounts[0]?.name ?? null;
  const locationNames: string[] = [];

  if (accountName) {
    const locationsResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,phoneNumbers,regularHours`,
      {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (locationsResponse.ok) {
      const locationsBody = (await locationsResponse.json()) as {
        locations?: Array<{ name?: string; title?: string }>;
      };
      for (const location of locationsBody.locations ?? []) {
        locationNames.push(location.title || location.name || "Location");
      }
    }
  }

  return {
    ok: true,
    live: true,
    synced: locationNames.length || 1,
    accountName,
    locationNames,
    configureHref: "/admin/seo/google?tab=business_profile",
    message:
      locationNames.length > 0
        ? `Synced ${locationNames.length} location(s) from ${accountName ?? "account"}.`
        : `Reached Business Profile account ${accountName ?? "unknown"} (no locations listed).`,
  };
}
