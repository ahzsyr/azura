import { safeEqualSecret } from "@/lib/crypto-compare";

export function getSetupTokenFromEnv(): string | undefined {
  const expected = process.env.SETUP_TOKEN?.trim();
  return expected || undefined;
}

export function isValidSetupToken(token: string | null | undefined): boolean {
  return safeEqualSecret(token, getSetupTokenFromEnv());
}

/** Production always requires SETUP_TOKEN; local/dev may proceed without it. */
export function isSetupTokenRequired(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Returns true when the request may proceed with setup/diagnostics.
 * - Production: presented token must match SETUP_TOKEN
 * - Non-production: valid token if set, otherwise open
 */
export function authorizeSetupToken(token: string | null | undefined): boolean {
  const expected = getSetupTokenFromEnv();
  if (isSetupTokenRequired()) {
    if (!expected) return false;
    return isValidSetupToken(token);
  }
  if (!expected) return true;
  return isValidSetupToken(token);
}

/**
 * First-run unlock for /api/setup/complete (setup not yet complete).
 * - Production: SETUP_TOKEN must be set in host env (presence unlocks; URL/body token optional)
 * - If a token is presented, it must still match
 * - Non-production: open when env unset; when env set, empty presented is allowed, wrong presented fails
 */
export function authorizeFirstRunSetup(token: string | null | undefined): boolean {
  const expected = getSetupTokenFromEnv();
  const presented = token?.trim() ?? "";

  if (isSetupTokenRequired()) {
    if (!expected) return false;
    if (!presented) return true;
    return isValidSetupToken(presented);
  }

  if (!expected) return true;
  if (!presented) return true;
  return isValidSetupToken(presented);
}
