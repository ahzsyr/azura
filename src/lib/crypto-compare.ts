import { timingSafeEqual } from "node:crypto";

/** Constant-time string compare. Returns false when lengths differ. */
export function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Compare a provided secret to an expected env value.
 * Empty expected → false (caller decides fail-open for non-production).
 */
export function safeEqualSecret(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  const p = provided?.trim() ?? "";
  const e = expected?.trim() ?? "";
  if (!e || !p) return false;
  return safeEqualString(p, e);
}
