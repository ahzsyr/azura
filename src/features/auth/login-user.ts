export type LoginUserCandidate = {
  email: string;
  pendingEmail?: string | null;
};

/**
 * Prefer the account whose login email matches. A pending address is accepted
 * so an admin who just changed email can sign in with the new address before
 * the confirmation link is opened.
 */
export function pickLoginUser<T extends LoginUserCandidate>(
  email: string,
  candidates: readonly T[],
): T | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return (
    candidates.find((user) => user.email.trim().toLowerCase() === normalized) ??
    candidates.find((user) => (user.pendingEmail ?? "").trim().toLowerCase() === normalized) ??
    null
  );
}
