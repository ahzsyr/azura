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
 * - Production: valid SETUP_TOKEN required
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
