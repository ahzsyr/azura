import "server-only";

import type { LoginOtpChannel } from "@/features/auth/login-mfa-factors";

/**
 * Delivery for login one-time codes.
 *
 * Email is native: it reuses the admin OTP Email Account. SMS and WhatsApp go
 * through a pluggable transport because no provider is wired yet — without one
 * `isConfigured` returns false, so those channels are never offered and a code
 * can never be "sent" into the void.
 *
 * To enable a provider later, call `setLoginOtpTransport` once at startup
 * (for example in `instrumentation.ts`) with an implementation that posts to
 * Twilio / WhatsApp Cloud API. No login-flow changes are needed.
 */
export type LoginOtpMessage = {
  channel: Exclude<LoginOtpChannel, "email">;
  to: string;
  code: string;
  /** Minutes until the code expires, for the message body. */
  expiresInMinutes: number;
};

export type LoginOtpTransport = {
  channel: Exclude<LoginOtpChannel, "email">;
  isConfigured: () => boolean | Promise<boolean>;
  send: (message: LoginOtpMessage) => Promise<{ sent: boolean; errorCode?: string }>;
};

const transports = new Map<string, LoginOtpTransport>();

export function setLoginOtpTransport(transport: LoginOtpTransport): void {
  transports.set(transport.channel, transport);
}

export function getLoginOtpTransport(
  channel: Exclude<LoginOtpChannel, "email">,
): LoginOtpTransport | null {
  return transports.get(channel) ?? null;
}

export async function isLoginOtpChannelConfigured(
  channel: LoginOtpChannel,
  deps: { emailConfigured: boolean },
): Promise<boolean> {
  if (channel === "email") return deps.emailConfigured;
  const transport = getLoginOtpTransport(channel);
  if (!transport) return false;
  try {
    return await transport.isConfigured();
  } catch {
    return false;
  }
}

/** E.164-ish: optional +, 8–15 digits. Blank/absent numbers are unusable. */
export function isUsablePhoneNumber(value: string | null | undefined): boolean {
  const digits = (value ?? "").replace(/[^\d]/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
