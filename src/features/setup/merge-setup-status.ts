import {
  getComingSoonEnvOverride,
  getRegistrationEnabledEnvOverride,
  getSetupCompleteEnvOverride,
} from "@/features/setup/setup-env-overrides";
import {
  COMPLETE_CACHE_TTL_MS,
  INCOMPLETE_CACHE_TTL_MS,
  setCachedSetupStatus,
  type SetupStatusCache,
} from "@/features/setup/setup-middleware-cache";

export type SetupStatusInput = Omit<SetupStatusCache, "expires">;

export function mergeSetupStatusWithEnvOverrides(
  status: SetupStatusInput,
  options?: { fromApi?: boolean },
): SetupStatusCache {
  const setupEnv = getSetupCompleteEnvOverride();
  const comingSoonEnv = getComingSoonEnvOverride();
  const registrationEnv = getRegistrationEnabledEnvOverride();

  let setupComplete = status.setupComplete;
  if (setupEnv === true) {
    setupComplete = true;
  } else if (options?.fromApi && !status.setupComplete) {
    setupComplete = false;
  }

  // Fallbacks must not reuse a bundled/stale comingSoon flag. Env is the only outage override.
  // After setup, Site access toggle (from API) is respected; env only applies when API is unavailable.
  const comingSoonEnabled = options?.fromApi
    ? status.comingSoonEnabled
    : (comingSoonEnv ?? false);

  const merged = {
    setupComplete,
    registrationEnabled: registrationEnv ?? status.registrationEnabled,
    comingSoonEnabled,
    confident: status.confident,
  };

  /** Durable complete state gets long TTL; incomplete stays short so setup can finish. */
  const ttl =
    options?.fromApi
      ? undefined
      : setupComplete && !comingSoonEnabled
        ? COMPLETE_CACHE_TTL_MS
        : INCOMPLETE_CACHE_TTL_MS;

  return setCachedSetupStatus(merged, ttl);
}

export function statusFromEnvFallback(): SetupStatusCache | null {
  const setupEnv = getSetupCompleteEnvOverride();
  const comingSoonEnv = getComingSoonEnvOverride();
  if (setupEnv === null && comingSoonEnv === null) return null;
  return setCachedSetupStatus(
    {
      setupComplete: setupEnv === true,
      registrationEnabled: getRegistrationEnabledEnvOverride() ?? true,
      comingSoonEnabled: comingSoonEnv ?? false,
      confident: setupEnv === true || comingSoonEnv !== null,
    },
    setupEnv === true && comingSoonEnv !== true ? COMPLETE_CACHE_TTL_MS : INCOMPLETE_CACHE_TTL_MS,
  );
}

/** Fallback when setup API is unavailable but the browser has the setup-complete cookie.
 *  Uses a short TTL so Site access coming-soon can be re-checked via API soon.
 */
export function setupStatusFromCookieFallback(): SetupStatusCache {
  const comingSoonEnv = getComingSoonEnvOverride();
  return mergeSetupStatusWithEnvOverrides({
    setupComplete: true,
    registrationEnabled: getRegistrationEnabledEnvOverride() ?? true,
    comingSoonEnabled: comingSoonEnv ?? false,
    /** Cookie proves setup finished; coming-soon may be stale until API succeeds. */
    confident: true,
  });
}
