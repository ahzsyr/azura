import type {
  BusinessProfileDiscoverySnapshot,
  GooglePlatformState,
} from "@/features/seo/google-platform/types";
import { BUSINESS_PROFILE_RATE_LIMITED_MESSAGE } from "./google-api-error";

export const BUSINESS_PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const BUSINESS_PROFILE_COOLDOWN_FALLBACK_MS = 15 * 60 * 1000;
export const BUSINESS_PROFILE_SCOPE = "https://www.googleapis.com/auth/business.manage";
export const BUSINESS_PROFILE_CONFIGURE_HREF = "/admin/seo/google?tab=business-profile";

export function emptyBusinessProfileDiscovery(): BusinessProfileDiscoverySnapshot {
  return {
    accounts: [],
    locations: [],
    businessAccountId: null,
    locationId: null,
    lastSyncedAt: null,
    rateLimitedUntil: null,
    lastError: null,
  };
}

export function isBusinessProfileRateLimitError(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  return (
    message === BUSINESS_PROFILE_RATE_LIMITED_MESSAGE ||
    /temporarily rate-limited/i.test(message) ||
    /request-per-minute quota was exceeded/i.test(message)
  );
}

/**
 * Clear expired cooldown and stale rate-limit lastError on the returned snapshot.
 * Does not invent lastSyncedAt — discovery still needs a successful sync.
 */
export function normalizeBusinessProfileDiscovery(
  discovery: BusinessProfileDiscoverySnapshot,
  now = Date.now(),
): BusinessProfileDiscoverySnapshot {
  const untilMs = discovery.rateLimitedUntil ? Date.parse(discovery.rateLimitedUntil) : NaN;
  const cooldownActive = Number.isFinite(untilMs) && untilMs > now;
  const rateLimitedUntil = cooldownActive ? discovery.rateLimitedUntil : null;
  const lastError =
    !cooldownActive && isBusinessProfileRateLimitError(discovery.lastError)
      ? null
      : discovery.lastError ?? null;
  if (rateLimitedUntil === discovery.rateLimitedUntil && lastError === (discovery.lastError ?? null)) {
    return discovery;
  }
  return {
    ...discovery,
    rateLimitedUntil,
    lastError,
  };
}

export function readBusinessProfileDiscovery(
  platform: Pick<GooglePlatformState, "services"> | null | undefined,
  now = Date.now(),
): BusinessProfileDiscoverySnapshot {
  const stored = platform?.services?.business_profile?.discovery;
  if (!stored) {
    const cfg = platform?.services?.business_profile?.configuration ?? {};
    const accountId = typeof cfg.businessAccountId === "string" ? cfg.businessAccountId.trim() : "";
    const locationId = typeof cfg.locationId === "string" ? cfg.locationId.trim() : "";
    return {
      ...emptyBusinessProfileDiscovery(),
      businessAccountId: accountId || null,
      locationId: locationId || null,
    };
  }
  return normalizeBusinessProfileDiscovery(
    {
      accounts: Array.isArray(stored.accounts) ? stored.accounts : [],
      locations: Array.isArray(stored.locations)
        ? stored.locations.map((loc) => ({
            name: loc.name,
            title: loc.title,
            phone: loc.phone ?? null,
            address: loc.address ?? null,
            primaryCategory: loc.primaryCategory ?? null,
            suggestedEntityType: loc.suggestedEntityType ?? null,
          }))
        : [],
      businessAccountId: stored.businessAccountId ?? null,
      locationId: stored.locationId ?? null,
      lastSyncedAt: stored.lastSyncedAt ?? null,
      rateLimitedUntil: stored.rateLimitedUntil ?? null,
      lastError: stored.lastError ?? null,
      napConflicts: Array.isArray(stored.napConflicts) ? stored.napConflicts : undefined,
      suggestedEntityType: stored.suggestedEntityType ?? null,
    },
    now,
  );
}

export function isBusinessProfileRateLimited(
  discovery: BusinessProfileDiscoverySnapshot,
  now = Date.now(),
): boolean {
  if (!discovery.rateLimitedUntil) return false;
  const until = Date.parse(discovery.rateLimitedUntil);
  return Number.isFinite(until) && until > now;
}

export function isBusinessProfileCacheFresh(
  discovery: BusinessProfileDiscoverySnapshot,
  now = Date.now(),
  ttlMs = BUSINESS_PROFILE_CACHE_TTL_MS,
): boolean {
  if (!discovery.lastSyncedAt) return false;
  const synced = Date.parse(discovery.lastSyncedAt);
  return Number.isFinite(synced) && now - synced < ttlMs;
}

export function parseRetryAfterMs(header: string | null, now = Date.now()): number | null {
  if (!header?.trim()) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.max(seconds * 1000, 1000), 15 * 60 * 1000);
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs) && dateMs > now) {
    return Math.min(dateMs - now, 15 * 60 * 1000);
  }
  return null;
}
