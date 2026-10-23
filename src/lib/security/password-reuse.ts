/**
 * Password reuse helper: compares the candidate against the CURRENT stored
 * hash only. Deliberately keeps no prior-password store and runs no expiry
 * process. Pure module so it is unit-testable; callers pass the stored hash.
 */
import bcrypt from "bcryptjs";

export const PASSWORD_REUSE_ERROR = "Choose a password you have not used before";

/** True when `candidate` matches the stored hash. */
export async function passwordMatchesHash(candidate: string, passwordHash: string): Promise<boolean> {
  if (!candidate || !passwordHash) return false;
  // bcryptjs reports an unparseable hash by returning false rather than
  // throwing. A corrupt hash can never equal a valid password, so "not a
  // match" is the correct, non-blocking answer here.
  return bcrypt.compare(candidate, passwordHash);
}

/** True when the new password equals the current one. */
export async function isPasswordReused(candidate: string, currentHash: string): Promise<boolean> {
  return passwordMatchesHash(candidate, currentHash);
}
