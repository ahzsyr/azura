import {
  getComingSoonEnvOverride,
  getRegistrationEnabledEnvOverride,
  getSetupCompleteEnvOverride,
} from "@/features/setup/setup-env-overrides";
import {
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

  const comingSoonEnabled = options?.fromApi
    ? status.comingSoonEnabled
    : (comingSoonEnv ?? status.comingSoonEnabled);

  return setCachedSetupStatus({
    setupComplete,
    registrationEnabled: registrationEnv ?? status.registrationEnabled,
    comingSoonEnabled,
    confident: status.confident,
  });
}

export function statusFromEnvFallback(): SetupStatusCache | null {
  const setupEnv = getSetupCompleteEnvOverride();
  const comingSoonEnv = getComingSoonEnvOverride();
  if (setupEnv === null && comingSoonEnv === null) return null;
  return setCachedSetupStatus({
    setupComplete: setupEnv === true,
    registrationEnabled: getRegistrationEnabledEnvOverride() ?? true,
    comingSoonEnabled: comingSoonEnv ?? false,
    confident: setupEnv === true || comingSoonEnv !== null,
  });
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
