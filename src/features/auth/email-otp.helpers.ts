import { createHash, randomInt } from "crypto";

export const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;
export const EMAIL_OTP_LENGTH = 6;

export type EmailOtpPurposeValue = "SIGNUP_VERIFY" | "ADMIN_LOGIN";

/** Pure helpers — safe for unit tests (no plaintext OTP in logs). */
export function hashEmailOtp(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function generateEmailOtpCode(): string {
  const max = 10 ** EMAIL_OTP_LENGTH;
  const n = randomInt(0, max);
  return String(n).padStart(EMAIL_OTP_LENGTH, "0");
}

export function isEmailOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function emailOtpExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + EMAIL_OTP_TTL_MS);
}
