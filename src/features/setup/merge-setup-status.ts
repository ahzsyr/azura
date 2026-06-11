import {
  getComingSoonEnvOverride,
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

  let setupComplete = status.setupComplete;
  if (options?.fromApi && !status.setupComplete) {
    setupComplete = false;
  } else if (setupEnv !== null) {
    setupComplete = setupEnv;
  }

  const comingSoonEnabled = options?.fromApi
    ? status.comingSoonEnabled
    : (comingSoonEnv ?? status.comingSoonEnabled);

  return setCachedSetupStatus({
    setupComplete,
    registrationEnabled: status.registrationEnabled,
    comingSoonEnabled,
    confident: status.confident,
  });
}

export function statusFromEnvFallback(): SetupStatusCache | null {
  const setupEnv = getSetupCompleteEnvOverride();
  const comingSoonEnv = getComingSoonEnvOverride();
  if (setupEnv === null && comingSoonEnv === null) return null;
  return setCachedSetupStatus({
    setupComplete: setupEnv ?? false,
    registrationEnabled: true,
    comingSoonEnabled: comingSoonEnv ?? false,
    confident: setupEnv !== null || comingSoonEnv !== null,
  });
}

/** Fallback when setup API is unavailable but the browser has the setup-complete cookie. */
export function setupStatusFromCookieFallback(): SetupStatusCache {
  const comingSoonEnv = getComingSoonEnvOverride();
  return mergeSetupStatusWithEnvOverrides({
    setupComplete: true,
    registrationEnabled: true,
    comingSoonEnabled: comingSoonEnv ?? false,
    confident: comingSoonEnv !== null,
  });
}
