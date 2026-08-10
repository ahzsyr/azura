/** In-memory setup status cache shared by middleware and setup API (same Node process). */

export type SetupStatusCache = {
  setupComplete: boolean;
  registrationEnabled: boolean;
  comingSoonEnabled: boolean;
  /** True when status came from API, env, or cookie — not from a failed-fetch guess. */
  confident: boolean;
  expires: number;
};

let setupStatusCache: SetupStatusCache | null = null;

const COMPLETE_CACHE_TTL_MS = 30 * 60 * 1000;
const INCOMPLETE_CACHE_TTL_MS = 30_000;

/** Return cached status when still valid and source was confident. */
export function getCachedSetupStatus(now = Date.now()): SetupStatusCache | null {
  if (setupStatusCache && setupStatusCache.expires > now && setupStatusCache.confident) {
    return setupStatusCache;
  }
  return null;
}

function resolveCacheTtl(status: Omit<SetupStatusCache, "expires">): number {
  if (status.comingSoonEnabled) return INCOMPLETE_CACHE_TTL_MS;
  return status.setupComplete ? COMPLETE_CACHE_TTL_MS : INCOMPLETE_CACHE_TTL_MS;
}

export function setCachedSetupStatus(
  status: Omit<SetupStatusCache, "expires">,
  ttlMs?: number,
): SetupStatusCache {
  const ttl = ttlMs ?? resolveCacheTtl(status);
  setupStatusCache = {
    ...status,
    expires: Date.now() + ttl,
  };
  return setupStatusCache;
}

export function invalidateSetupStatusCache() {
  setupStatusCache = null;
}
