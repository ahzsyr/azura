/**
 * Password-reset one-time codes: pure helpers (unit-testable).
 *
 * A reset code only ever proves that its holder may choose a new password for
 * the account it was mailed to. It never proves that the address has an
 * account — the request endpoint answers identically either way.
 */

export const PASSWORD_RESET_OTP_LENGTH = 6;
/** Reset-code lifetime, measured from the most recent send. */
export const PASSWORD_RESET_OTP_TTL_MINUTES = 10;
export const PASSWORD_RESET_OTP_TTL_MS =
  PASSWORD_RESET_OTP_TTL_MINUTES * 60 * 1000;

/** Tickets carried between the "enter code" step and the "choose password" step. */
export const PASSWORD_RESET_TICKET_MINUTES = 15;
export const PASSWORD_RESET_TICKET_TTL_MS = PASSWORD_RESET_TICKET_MINUTES * 60 * 1000;

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists for that email, we will send a 6-digit code to reset your password.";

export function isPasswordResetOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

/** Accepts "123 456" / "123-456" from copy-paste and normalizes to 6 digits. */
export function normalizePasswordResetCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const digits = code.replace(/[\s-]/g, "");
  return isPasswordResetOtpFormat(digits) ? digits : null;
}

/**
 * Hint shown next to the code field. The domain is shown (the user typed it),
 * the local part is masked so shoulder-surfers learn nothing new.
 */
export function maskResetHint(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return "";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const head = local[0] ?? "";
  return `${head}${"•".repeat(Math.min(6, Math.max(2, local.length - 1)))}@${domain}`;
}

export type PasswordResetStage = "request" | "verify" | "password";

/** Which screen the reset flow is on, derived from the ticket state. */
export function resolvePasswordResetStage(input: {
  hasTicket: boolean;
  ticketVerified: boolean;
}): PasswordResetStage {
  if (!input.hasTicket) return "request";
  if (!input.ticketVerified) return "verify";
  return "password";
}

/** Response body for the request step — identical for every address. */
export function genericResetRequestResponse(): { success: true; message: string } {
  return { success: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
}
