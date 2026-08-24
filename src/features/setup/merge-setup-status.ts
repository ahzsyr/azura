import {
  getComingSoonEnvOverride,
  getRegistrationEnabledEnvOverride,
  getSetupCompleteEnvOverride,
} from "@/features/setup/setup-env-overrides";
import {
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
  const comingSoonEnabled = options?.fromApi
    ? status.comingSoonEnabled
    : (comingSoonEnv ?? false);

  return setCachedSetupStatus(
    {
      setupComplete,
      registrationEnabled: registrationEnv ?? status.registrationEnabled,
      comingSoonEnabled,
      confident: status.confident,
    },
    options?.fromApi ? undefined : INCOMPLETE_CACHE_TTL_MS,
  );
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
    INCOMPLETE_CACHE_TTL_MS,
  );
}

/** Fallback when setup API is unavailable but the browser has the setup-complete cookie. */
export function setupStatusFromCookieFallback(): SetupStatusCache {
  const comingSoonEnv = getComingSoonEnvOverride();
  return mergeSetupStatusWithEnvOverrides({
    setupComplete: true,
    registrationEnabled: getRegistrationEnabledEnvOverride() ?? true,
    comingSoonEnabled: comingSoonEnv ?? false,
    confident: comingSoonEnv !== null,
  });
}
