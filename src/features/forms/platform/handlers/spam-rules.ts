/**
 * Pure form-spam rules (safe to import from tests and from either runtime).
 * The database-backed limiter itself lives in spam-handler.ts (server-only).
 */

export const FORM_SUBMIT_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * 60 * 1000,
} as const;

/** The shared rate-limit bucket key for a client IP. */
export function formSubmitRateLimitKey(clientIp: string): string {
  return `forms-submit-budget:${clientIp.trim() || "unknown"}`;
}

export function isHoneypotTriggered(honeypot: unknown): boolean {
  if (honeypot == null) return false;
  return String(honeypot).trim().length > 0;
}
