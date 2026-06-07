/** Env overrides for setup/coming-soon — safe for middleware (no server-only). */

export function getSetupCompleteEnvOverride(): boolean | null {
  const env = process.env.SETUP_COMPLETE?.trim().toLowerCase();
  if (env === "true" || env === "1") return true;
  if (env === "false" || env === "0") return false;
  return null;
}

export function getComingSoonEnvOverride(): boolean | null {
  const env = process.env.COMING_SOON_ENABLED?.trim().toLowerCase();
  if (env === "true" || env === "1") return true;
  if (env === "false" || env === "0") return false;
  return null;
}
