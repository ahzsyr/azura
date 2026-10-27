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

/**
 * Shown on the verify step when the request succeeded but no ticket was
 * issued (no confirmed delivery for this browser). Same wording for known and
 * unknown addresses — never reveals whether the account exists.
 */
export const PASSWORD_RESET_NO_DELIVERY_CONFIRMATION =
  "Your request was accepted, but this browser did not get a delivery confirmation. Check spam, wait a few minutes and resend, or ask an administrator to confirm Email delivery and that password reset is enabled under Visitor portal.";

/** Verify-step copy: delivery confirmed (ticket present) vs not confirmed. */
export function passwordResetVerifyDescription(input: {
  hasTicket: boolean;
  hint?: string | null;
}): string {
  if (input.hasTicket) {
    const dest = input.hint?.trim() ? ` to ${input.hint.trim()}` : "";
    return `We emailed a 6-digit code${dest}. It expires in ${PASSWORD_RESET_OTP_TTL_MINUTES} minutes.`;
  }
  return PASSWORD_RESET_NO_DELIVERY_CONFIRMATION;
}

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
