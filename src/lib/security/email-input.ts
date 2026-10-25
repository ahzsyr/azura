/**
 * The ONE server-side email schema. Every endpoint that accepts an email
 * address must use this so normalization and limits are identical:
 *
 *   trim → lowercase → RFC-ish format check → max 254 (RFC 5321 path limit)
 *
 * Do not hand-roll `z.string().email()` at call sites; import these instead.
 */
import { z } from "zod";

export const EMAIL_MAX_LENGTH = 254;

/** Trim + lowercase only. Safe for non-validated inputs (no throw). */
export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Normalized, validated email. Output is already trimmed and lowercased, so
 * callers must NOT trim/lowercase again before storing.
 */
const EMAIL_MESSAGE = "Enter a valid email address";

/** ASCII local-part plus a real-looking domain. Rejects homograph and IP hosts. */
function hasEnglishEmailShape(value: string): boolean {
  const at = value.lastIndexOf("@");
  if (at <= 0) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (local.length > 64 || domain.length > 253) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)) {
    return false;
  }
  const tld = domain.split(".").pop() ?? "";
  return /^[a-z]{2,24}$/.test(tld);
}

export const emailInputSchema = z
  // zod v4 replaced `required_error`/`invalid_type_error` with a single `error`
  // string; keep one message for missing, wrong-type and format failures.
  .string({ error: EMAIL_MESSAGE })
  .trim()
  .toLowerCase()
  .email(EMAIL_MESSAGE)
  .max(EMAIL_MAX_LENGTH, EMAIL_MESSAGE)
  .refine(hasEnglishEmailShape, EMAIL_MESSAGE);

export function assessEmailPattern(value: string): {
  ok: boolean;
  message: string | null;
  normalized: string;
} {
  const parsed = emailInputSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, message: EMAIL_MESSAGE, normalized: normalizeEmail(value) };
  }
  return { ok: true, message: null, normalized: parsed.data };
}

/** Optional variant for fields that may be omitted or blank ("" → undefined). */
export const optionalEmailInputSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  },
  emailInputSchema.optional(),
);

export type EmailInput = z.infer<typeof emailInputSchema>;
