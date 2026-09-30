import "server-only";

import {
  BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
  formatGoogleApiError,
} from "./google-api-error";
import {
  BUSINESS_PROFILE_CONFIGURE_HREF,
  BUSINESS_PROFILE_COOLDOWN_FALLBACK_MS,
  BUSINESS_PROFILE_SCOPE,
  isBusinessProfileCacheFresh,
  isBusinessProfileRateLimitError,
  isBusinessProfileRateLimited,
  parseRetryAfterMs,
  readBusinessProfileDiscovery,
} from "./business-profile-cache";
import { seoRepository } from "@/repositories/seo.repository";
import { refreshGoogleToken } from "@/features/seo/integrations/google-auth";
import {
  getGooglePlatformState,
  upsertGooglePlatformState,
} from "@/features/seo/google-platform/persistence";
import type {
  BusinessProfileDiscoverySnapshot,
  GooglePlatformState,
} from "@/features/seo/google-platform/types";
import {
  compareGbpNapWithSite,
  parseGbpLocation,
} from "./gbp-local-signals";

export {
  BUSINESS_PROFILE_CACHE_TTL_MS,
  BUSINESS_PROFILE_CONFIGURE_HREF,
  BUSINESS_PROFILE_COOLDOWN_FALLBACK_MS,
  BUSINESS_PROFILE_SCOPE,
  emptyBusinessProfileDiscovery,
  isBusinessProfileCacheFresh,
  isBusinessProfileRateLimitError,
  isBusinessProfileRateLimited,
  normalizeBusinessProfileDiscovery,
  readBusinessProfileDiscovery,
} from "./business-profile-cache";

export type BusinessProfileSyncResult = {
  ok: boolean;
  live: boolean;
  synced: number;
  accountName?: string | null;
  locationNames: string[];
  configureHref: string;
  message: string;
  discovery: BusinessProfileDiscoverySnapshot;
  rateLimited: boolean;
};

export type BusinessProfileSyncOptions = {
  force?: boolean;
};

export type BusinessProfileRuntime = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  fetch: typeof fetch;
  loadState: () => Promise<GooglePlatformState>;
  saveState: (state: GooglePlatformState) => Promise<void>;
  resolveToken?: (state: GooglePlatformState) => Promise<string>;
};

const defaultRuntime: BusinessProfileRuntime = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  fetch: (...args) => fetch(...args),
  loadState: () => getGooglePlatformState(),
  saveState: (state) => upsertGooglePlatformState(state),
};

let runtimeOverride: Partial<BusinessProfileRuntime> | null = null;
let inFlight: Promise<BusinessProfileSyncResult> | null = null;

export function setBusinessProfileRuntimeForTests(next: Partial<BusinessProfileRuntime> | null) {
  runtimeOverride = next;
  inFlight = null;
}

function runtime(): BusinessProfileRuntime {
  return { ...defaultRuntime, ...runtimeOverride };
}

function resultFromDiscovery(
  discovery: BusinessProfileDiscoverySnapshot,
  extras: Partial<BusinessProfileSyncResult> & Pick<BusinessProfileSyncResult, "ok" | "message">,
): BusinessProfileSyncResult {
  const locationNames = discovery.locations.map((loc) => loc.title || loc.name || "Location");
  return {
    live: extras.live ?? false,
    synced: locationNames.length || (discovery.businessAccountId ? 1 : 0),
    accountName: discovery.businessAccountId ?? discovery.accounts[0]?.name ?? null,
    locationNames,
    configureHref: BUSINESS_PROFILE_CONFIGURE_HREF,
    discovery,
    rateLimited: isBusinessProfileRateLimited(discovery),
    ...extras,
  };
}

async function resolveBusinessProfileToken(state: GooglePlatformState): Promise<string> {
  const custom = runtime().resolveToken;
  if (custom) return custom(state);

  const grantedScopes = state.services?.business_profile?.connection?.grantedScopes ?? [];
  if (!grantedScopes.includes(BUSINESS_PROFILE_SCOPE)) {
    throw new Error(
      "Business Profile OAuth token is missing the business.manage scope. Reconnect Business Profile under Admin → SEO → Google.",
    );
  }
  const fromPlatform = state.services?.business_profile?.configuration;
  const platformToken =
    (typeof fromPlatform?.accessToken === "string" && fromPlatform.accessToken.trim()) ||
    (typeof fromPlatform?.bearerToken === "string" && fromPlatform.bearerToken.trim()) ||
    null;
  if (platformToken) return platformToken;

  const integrations = await seoRepository.getIntegrationsConfig();
  const google = integrations.google;
  if (!google?.bearerToken?.trim() && !google?.refreshToken?.trim()) {
    throw new Error(
      "Business Profile OAuth token not available. Connect Business Profile under Admin → SEO → Google.",
    );
  }
  const token = (await refreshGoogleToken(google))?.trim() || google.bearerToken?.trim();
  if (!token) {
    throw new Error("Could not refresh Google OAuth token for Business Profile.");
  }
  return token;
}

async function fetchGoogle(
  url: string,
  token: string,
): Promise<{ ok: boolean; status: number; body: string; retryAfter: string | null }> {
  const { fetch: fetchImpl } = runtime();
  const response = await fetchImpl(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const retryAfter = response.headers.get("retry-after");
  const body = await response.text().catch(() => "");
  // Fail-fast on 429 — do not burn more Account Management RPM in the same window.
  return {
    ok: response.ok,
    status: response.status,
    body,
    retryAfter,
  };
}

function rateLimitedUntilIso(retryAfter: string | null, now: number): string {
  const parsed = parseRetryAfterMs(retryAfter, now);
  // Floor at 15 minutes so "Ready to retry" is not immediately followed by another 429.
  const wait = Math.max(parsed ?? BUSINESS_PROFILE_COOLDOWN_FALLBACK_MS, BUSINESS_PROFILE_COOLDOWN_FALLBACK_MS);
  return new Date(now + wait).toISOString();
}

async function applySuggestedEntityTypeIfUnpinned(suggested: string | null | undefined) {
  if (!suggested?.trim()) return;
  try {
    const config = await seoRepository.getStructuredConfig();
    if (config.entityTypePinned || config.entityType?.trim()) return;
    await seoRepository.upsertStructuredConfig({ ...config, entityType: suggested });
  } catch {
    // Suggestion must not fail a live GBP sync.
  }
}

async function collectLocalLandingNapPages(): Promise<
  Array<{ source: string; name?: string | null; address?: string | null; phone?: string | null }>
> {
  try {
    const { resolvePageSeoContext } = await import("@/features/seo/resolve-page-seo-context");
    const pages: Array<{
      source: string;
      name?: string | null;
      address?: string | null;
      phone?: string | null;
    }> = [];
    for (const pageKey of ["contact", "about"] as const) {
      const context = await resolvePageSeoContext({
        pageKey,
        originContext: "public",
        allowWrites: false,
      });
      pages.push({
        source: `${pageKey}_page`,
        name: context.contentFallbacks.titleEn || context.translations.titleEn || null,
        address: null,
        phone: null,
      });
    }
    return pages;
  } catch {
    return [];
  }
}

async function resolveSiteNapConflicts(
  locations: BusinessProfileDiscoverySnapshot["locations"],
): Promise<string[]> {
  const primary = locations[0];
  if (!primary) return [];
  try {
    const { getCompanyInfo } = await import("@/lib/data");
    const company = await getCompanyInfo().catch(() => null);
    const address =
      company?.localizedLegacy?.addressEn?.trim() ||
      company?.localizedLegacy?.address?.trim() ||
      null;
    return compareGbpNapWithSite({
      gbp: { name: primary.title, address: primary.address, phone: primary.phone },
      company: { name: company?.name, address, phone: company?.phone },
      pages: await collectLocalLandingNapPages(),
    });
  } catch {
    return [];
  }
}

async function persistDiscovery(
  current: GooglePlatformState,
  discovery: BusinessProfileDiscoverySnapshot,
): Promise<GooglePlatformState> {
  const existing = current.services.business_profile;
  const rateLimited =
    Boolean(discovery.rateLimitedUntil) &&
    Date.parse(discovery.rateLimitedUntil!) > runtime().now();
  let connection = existing?.connection;
  if (
    connection?.message &&
    !rateLimited &&
    isBusinessProfileRateLimitError(connection.message)
  ) {
    connection = { ...connection, message: "Connected" };
  }
  const next: GooglePlatformState = {
    ...current,
    services: {
      ...current.services,
      business_profile: {
        configuration: {
          ...(existing?.configuration ?? {}),
          ...(discovery.businessAccountId
            ? { businessAccountId: discovery.businessAccountId }
            : {}),
          ...(discovery.locationId ? { locationId: discovery.locationId } : {}),
        },
        policy: existing?.policy ?? {},
        connection,
        monitoring: {
          ...(existing?.monitoring ?? {}),
          lastSyncAt: discovery.lastSyncedAt ?? existing?.monitoring?.lastSyncAt,
          // Rate-limit is a warning, not a hard error (keeps OAuth "connected" + amber sidebar).
          errors:
            rateLimited || isBusinessProfileRateLimitError(discovery.lastError)
              ? 0
              : discovery.lastError
                ? 1
                : 0,
          warnings: rateLimited ? 1 : 0,
        },
        discovery,
        schemaVersion: existing?.schemaVersion ?? 1,
        migrationVersion: existing?.migrationVersion ?? 1,
      },
    },
  };
  await runtime().saveState(next);
  return next;
}

async function performLiveSync(state: GooglePlatformState): Promise<BusinessProfileSyncResult> {
  const { now } = runtime();
  const token = await resolveBusinessProfileToken(state);
  const currentDiscovery = readBusinessProfileDiscovery(state, now());

  const accountsResponse = await fetchGoogle(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    token,
  );

  if (accountsResponse.status === 429) {
    const discovery: BusinessProfileDiscoverySnapshot = {
      ...currentDiscovery,
      rateLimitedUntil: rateLimitedUntilIso(accountsResponse.retryAfter, now()),
      lastError: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    };
    await persistDiscovery(state, discovery);
    return resultFromDiscovery(discovery, {
      ok: false,
      live: true,
      message: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    });
  }

  if (!accountsResponse.ok) {
    throw new Error(
      formatGoogleApiError(accountsResponse.status, accountsResponse.body, {
        apiLabel: "Business Profile Account Management API",
        extraHint:
          "Enable My Business Account Management and Business Information APIs, then reconnect Business Profile with the business.manage OAuth scope under Admin → SEO → Google.",
      }),
    );
  }

  let accountsBody: { accounts?: Array<{ name?: string; accountName?: string }> } = {};
  try {
    accountsBody = JSON.parse(accountsResponse.body) as typeof accountsBody;
  } catch {
    accountsBody = {};
  }
  const accounts = (accountsBody.accounts ?? [])
    .filter((account) => account.name)
    .map((account) => ({
      name: account.name as string,
      accountName: account.accountName,
    }));

  if (accounts.length === 0) {
    const discovery: BusinessProfileDiscoverySnapshot = {
      accounts: [],
      locations: [],
      businessAccountId: null,
      locationId: null,
      lastSyncedAt: new Date(now()).toISOString(),
      rateLimitedUntil: null,
      lastError: null,
    };
    await persistDiscovery(state, discovery);
    return resultFromDiscovery(discovery, {
      ok: true,
      live: true,
      message: "No Business Profile accounts found for this credential.",
    });
  }

  const accountName = accounts[0]?.name ?? null;
  const locations: BusinessProfileDiscoverySnapshot["locations"] = [];

  if (accountName) {
    await runtime().sleep(300);
    const locationsResponse = await fetchGoogle(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,phoneNumbers,regularHours,categories`,
      token,
    );
    if (locationsResponse.status === 429) {
      const discovery: BusinessProfileDiscoverySnapshot = {
        ...currentDiscovery,
        accounts,
        businessAccountId: accountName,
        rateLimitedUntil: rateLimitedUntilIso(locationsResponse.retryAfter, now()),
        lastError: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
      };
      await persistDiscovery(state, discovery);
      return resultFromDiscovery(discovery, {
        ok: false,
        live: true,
        message: BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
      });
    }
    if (locationsResponse.ok) {
      try {
        const locationsBody = JSON.parse(locationsResponse.body) as {
          locations?: Array<Parameters<typeof parseGbpLocation>[0]>;
        };
        for (const location of locationsBody.locations ?? []) {
          const parsed = parseGbpLocation(location);
          locations.push({
            name: parsed.name,
            title: parsed.title,
            phone: parsed.phone,
            address: parsed.address,
            primaryCategory: parsed.primaryCategory,
            suggestedEntityType: parsed.suggestedEntityType,
          });
        }
      } catch {
        // keep empty locations
      }
    }
  }

  const suggestedEntityType =
    locations.find((loc) => loc.suggestedEntityType)?.suggestedEntityType ?? null;
  const napConflicts = await resolveSiteNapConflicts(locations);
  const discovery: BusinessProfileDiscoverySnapshot = {
    accounts,
    locations,
    businessAccountId: accountName,
    locationId: locations[0]?.name ?? null,
    lastSyncedAt: new Date(now()).toISOString(),
    rateLimitedUntil: null,
    lastError: null,
    napConflicts,
    suggestedEntityType,
  };
  await persistDiscovery(state, discovery);
  await applySuggestedEntityTypeIfUnpinned(suggestedEntityType);
  const locationNames = locations.map((loc) => loc.title);
  return resultFromDiscovery(discovery, {
    ok: true,
    live: true,
    message:
      locationNames.length > 0
        ? `Synced ${locationNames.length} location(s) from ${accountName ?? "account"}.`
        : `Reached Business Profile account ${accountName ?? "unknown"} (no locations listed).`,
  });
}

export async function getBusinessProfileDiscovery(): Promise<BusinessProfileDiscoverySnapshot> {
  const state = await runtime().loadState();
  return readBusinessProfileDiscovery(state, runtime().now());
}

export async function syncBusinessProfileLocations(
  options: BusinessProfileSyncOptions = {},
): Promise<BusinessProfileSyncResult> {
  const force = Boolean(options.force);
  const state = await runtime().loadState();
  const now = runtime().now();
  const discovery = readBusinessProfileDiscovery(state, now);

  // Persist cleared expired rate-limit fields so the UI does not resurrect them.
  const stored = state.services?.business_profile?.discovery;
  if (
    stored &&
    ((Boolean(stored.rateLimitedUntil) && !discovery.rateLimitedUntil) ||
      (isBusinessProfileRateLimitError(stored.lastError) && !discovery.lastError))
  ) {
    await persistDiscovery(state, discovery);
  }

  if (isBusinessProfileRateLimited(discovery, now)) {
    return resultFromDiscovery(discovery, {
      ok: false,
      live: false,
      message: discovery.lastError?.trim() || BUSINESS_PROFILE_RATE_LIMITED_MESSAGE,
    });
  }

  if (!force && isBusinessProfileCacheFresh(discovery, now)) {
    return resultFromDiscovery(discovery, {
      ok: true,
      live: false,
      message: discovery.lastSyncedAt
        ? `Using cached Business Profile data from ${discovery.lastSyncedAt}.`
        : "Using cached Business Profile data.",
    });
  }

  if (inFlight) return inFlight;

  const pending = performLiveSync(state)
    .catch(async (error) => {
      const latest = await runtime().loadState();
      const current = readBusinessProfileDiscovery(latest, runtime().now());
      await persistDiscovery(latest, {
        ...current,
        lastError: error instanceof Error ? error.message : String(error),
      });
      throw error;
    })
    .finally(() => {
      if (inFlight === pending) inFlight = null;
    });
  inFlight = pending;
  return pending;
}

/**
 * Test Connection bootstrap: one forced discovery when never synced.
 * Skips dry-run, rate-limit, and fresh lastSyncedAt. Never throws — lastError is persisted on failure.
 */
export async function bootstrapBusinessProfileDiscoveryIfNeeded(
  options: { dryRun?: boolean } = {},
): Promise<BusinessProfileSyncResult | null> {
  if (options.dryRun) return null;
  const state = await runtime().loadState();
  const now = runtime().now();
  const discovery = readBusinessProfileDiscovery(state, now);
  if (isBusinessProfileRateLimited(discovery, now)) return null;
  if (discovery.lastSyncedAt) return null;
  try {
    return await syncBusinessProfileLocations({ force: true });
  } catch {
    return null;
  }
}

/**
 * Persist cleared expired rate-limit discovery + monitoring.errors=0.
 * Best-effort for admin page load so the sidebar does not stay red after cooldown.
 */
export async function clearExpiredBusinessProfileRateLimitIfNeeded(): Promise<boolean> {
  try {
    const state = await runtime().loadState();
    const now = runtime().now();
    const stored = state.services?.business_profile?.discovery;
    const monitoringErrors = state.services?.business_profile?.monitoring?.errors ?? 0;
    if (!stored && monitoringErrors === 0) return false;
    const discovery = readBusinessProfileDiscovery(state, now);
    const storedHadExpiredCooldown = Boolean(
      stored?.rateLimitedUntil && !discovery.rateLimitedUntil,
    );
    const storedHadStaleRateLimitError =
      isBusinessProfileRateLimitError(stored?.lastError) && !discovery.lastError;
    const stickyErrors = monitoringErrors > 0 && !isBusinessProfileRateLimited(discovery, now) && !discovery.lastError;
    if (!storedHadExpiredCooldown && !storedHadStaleRateLimitError && !stickyErrors) {
      return false;
    }
    await persistDiscovery(state, discovery);
    return true;
  } catch {
    return false;
  }
}

/** OAuth callback: one forced discovery. Never throws — OAuth remains success. */
export async function syncBusinessProfileAfterOAuth(): Promise<BusinessProfileSyncResult | null> {
  try {
    return await syncBusinessProfileLocations({ force: true });
  } catch {
    return null;
  }
}
