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
export const emailInputSchema = z
  .string({ required_error: "Enter a valid email address", invalid_type_error: "Enter a valid email address" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(EMAIL_MAX_LENGTH, "Enter a valid email address");

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
