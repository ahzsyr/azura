import { z } from "zod";

/** Common passwords (lowercase) rejected for new/changed passwords. */
const COMMON_PASSWORDS = new Set(
  [
    "password",
    "password1",
    "password12",
    "password123",
    "password1234",
    "password12345",
    "12345678",
    "123456789",
    "1234567890",
    "123456789012",
    "qwerty123",
    "qwerty123456",
    "qwertyuiop",
    "letmein123",
    "letmein12345",
    "welcome1",
    "welcome12",
    "welcome123",
    "welcome1234",
    "admin123",
    "admin1234",
    "admin12345",
    "admin123456",
    "changeme",
    "changeme1",
    "changeme12",
    "changeme123",
    "iloveyou",
    "iloveyou123",
    "monkey123",
    "dragon123",
    "master123",
    "login1234",
    "abc123456",
    "abc123456789",
    "passw0rd",
    "passw0rd1234",
    "p@ssw0rd",
    "p@ssw0rd1234",
    "p@ssword",
    "p@ssword1234",
  ].map((s) => s.toLowerCase()),
);

/** Printable English ASCII only. Spaces and non-English letters are rejected. */
const ENGLISH_PASSWORD = /^[\x21-\x7E]+$/;

export type PasswordChecks = {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
  english: boolean;
  uncommon: boolean;
};

/** Shared by the password schema and the live checklist. */
export function assessPassword(value: string): { ok: boolean; checks: PasswordChecks } {
  const english = value.length === 0 || ENGLISH_PASSWORD.test(value);
  const checks: PasswordChecks = {
    length: value.length >= 12 && value.length <= 128,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    symbol: english && /[^A-Za-z0-9]/.test(value),
    english,
    uncommon: value.length > 0 && !COMMON_PASSWORDS.has(value.toLowerCase()),
  };
  return { ok: Object.values(checks).every(Boolean), checks };
}

/**
 * Server-authoritative policy for creating, changing, and resetting passwords.
 * Applies to every account type. Login still accepts existing shorter hashes.
 */
export const passwordPolicySchema = z.string().superRefine((value, ctx) => {
  const { checks } = assessPassword(value);
  if (!checks.english) {
    ctx.addIssue({ code: "custom", message: "Use English letters, numbers, and symbols only" });
    return;
  }
  if (!checks.length) {
    ctx.addIssue({
      code: "custom",
      message:
        value.length > 128
          ? "Password must be at most 128 characters"
          : "Password must be at least 12 characters",
    });
  }
  if (!checks.uppercase) ctx.addIssue({ code: "custom", message: "Include an uppercase letter" });
  if (!checks.lowercase) ctx.addIssue({ code: "custom", message: "Include a lowercase letter" });
  if (!checks.number) ctx.addIssue({ code: "custom", message: "Include a number" });
  if (!checks.symbol) ctx.addIssue({ code: "custom", message: "Include a symbol" });
  if (!checks.uncommon) ctx.addIssue({ code: "custom", message: "Choose a less common password" });
});

export type PasswordPolicy = z.infer<typeof passwordPolicySchema>;
