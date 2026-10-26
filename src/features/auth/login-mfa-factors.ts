/**
 * Pure login-factor policy: which second factor to try first, and how to
 * classify a typed code. Kept free of Prisma/Next imports so it is unit
 * testable and safe to share with the (client) login form.
 */

export type LoginMfaFactor = "totp" | "email_otp" | "sms_otp" | "whatsapp_otp";

export const LOGIN_MFA_FACTORS: readonly LoginMfaFactor[] = [
  "totp",
  "email_otp",
  "sms_otp",
  "whatsapp_otp",
];

/** Codes are always 6 digits at login; recovery codes are longer + hyphenated. */
export const LOGIN_OTP_DIGITS = 6;

export type LoginOtpChannel = "email" | "sms" | "whatsapp";

export function isLoginOtpChannel(value: unknown): value is LoginOtpChannel {
  return value === "email" || value === "sms" || value === "whatsapp";
}

/**
 * Authenticator-app codes and delivered OTPs are both 6 digits and are
 * indistinguishable on the wire, so the server tries the authenticator first
 * (per product requirement) and falls back to the stored OTP digests.
 */
export function isSixDigitCode(code: string): boolean {
  return new RegExp(`^\\d{${LOGIN_OTP_DIGITS}}$`).test(code.trim());
}

/**
 * Recovery codes are 10 hex chars grouped 4-4-2, e.g. "0123-4567-89".
 * The alphabet is hex, so letters run A–F only.
 */
export function isRecoveryCodeFormat(code: string): boolean {
  return /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{2}$/.test(code.trim().toUpperCase());
}

/**
 * Order the factors a challenge should offer, authenticator app first.
 *
 * `totp` leads whenever the account has it enrolled. Delivered channels follow
 * in preference order and are dropped entirely when they cannot be delivered,
 * so the UI never offers a code that can never arrive.
 */
export function rankLoginMfaFactors(input: {
  totpEnabled: boolean;
  emailDeliverable: boolean;
  phoneDeliverable: boolean;
  whatsappDeliverable: boolean;
}): LoginMfaFactor[] {
  const ranked: LoginMfaFactor[] = [];
  if (input.totpEnabled) ranked.push("totp");
  if (input.emailDeliverable) ranked.push("email_otp");
  if (input.phoneDeliverable) ranked.push("sms_otp");
  if (input.whatsappDeliverable) ranked.push("whatsapp_otp");
  return ranked;
}

/**
 * The factor used when the user has not explicitly chosen one: the strongest
 * deliverable method. Prefers the authenticator, otherwise the first OTP
 * channel that can actually be delivered.
 */
export function defaultLoginMfaFactor(factors: readonly LoginMfaFactor[]): LoginMfaFactor | null {
  return factors[0] ?? null;
}

/** Channels able to deliver an OTP, in preference order. */
export function otpChannelsFromFactors(
  factors: readonly LoginMfaFactor[],
): LoginOtpChannel[] {
  const channels: LoginOtpChannel[] = [];
  for (const factor of factors) {
    if (factor === "email_otp") channels.push("email");
    else if (factor === "sms_otp") channels.push("sms");
    else if (factor === "whatsapp_otp") channels.push("whatsapp");
  }
  return channels;
}

/**
 * Decide what a submitted login code should be checked against.
 *
 * - recovery code  → recovery only
 * - authenticator enrolled → authenticator first, then any delivered OTP
 * - no authenticator → delivered OTP only
 *
 * `fallbackToDeliveredOtp` is false when no OTP has actually been issued, so a
 * wrong authenticator code fails fast instead of masking as an OTP mismatch.
 */
export function resolveLoginMfaAttempt(input: {
  code: string;
  totpEnabled: boolean;
  hasDeliveredOtp: boolean;
}): {
  kind: "recovery" | "authenticator" | "delivered_otp" | "none";
  tryAuthenticatorFirst: boolean;
  tryDeliveredOtp: boolean;
} {
  const code = input.code.trim();
  if (isRecoveryCodeFormat(code)) {
    return { kind: "recovery", tryAuthenticatorFirst: false, tryDeliveredOtp: false };
  }
  if (input.totpEnabled && isSixDigitCode(code)) {
    return {
      kind: "authenticator",
      tryAuthenticatorFirst: true,
      tryDeliveredOtp: input.hasDeliveredOtp,
    };
  }
  if (input.hasDeliveredOtp && isSixDigitCode(code)) {
    return { kind: "delivered_otp", tryAuthenticatorFirst: false, tryDeliveredOtp: true };
  }
  return { kind: "none", tryAuthenticatorFirst: false, tryDeliveredOtp: false };
}

/** What the person signing in is asked for, given the factor ordering. */
export function describeLoginChallenge(factors: readonly LoginMfaFactor[]): {
  primary: LoginMfaFactor | null;
  willSendOtpImmediately: boolean;
  otpChannelCount: number;
  offersAuthenticator: boolean;
} {
  const primary = defaultLoginMfaFactor(factors);
  const channels = otpChannelsFromFactors(factors);
  return {
    primary,
    // Sending an OTP is a side effect: only do it when there is no
    // authenticator to use, otherwise wait for the user to ask for one.
    willSendOtpImmediately: primary !== null && primary !== "totp",
    otpChannelCount: channels.length,
    offersAuthenticator: factors.includes("totp"),
  };
}
