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
 *
 * - Production: SETUP_TOKEN must be configured AND the request must present a
 *   token that matches it. An empty presented token is a FAILURE — merely
 *   having the env var set is not authorization.
 * - Non-production: open when the env var is unset. When it is set, a
 *   presented token must still match; an empty presented token is accepted for
 *   local convenience (empty still fails via isValidSetupToken, so it can never
 *   authenticate against a configured value).
 */
export function authorizeFirstRunSetup(token: string | null | undefined): boolean {
  const expected = getSetupTokenFromEnv();
  const presented = token?.trim() ?? "";

  if (isSetupTokenRequired()) {
    if (!expected) return false;
    // Must actually present the matching token.
    return presented.length > 0 && safeEqualSecret(presented, expected);
  }

  if (!expected) return true;
  if (!presented) return true;
  return isValidSetupToken(presented);
}
