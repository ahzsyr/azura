import "server-only";

import { accountSettingsService, type AccountSettings } from "@/features/account/account-settings.service";
import type { EmailProviderConfig } from "@/features/email/email-accounts.types";
import {
  getEmailAccountRecord,
  isEmailAccountConfigured,
  resolveEmailProviderConfig,
} from "@/features/email/email-accounts.service";

/**
 * Single place that answers "which mailbox sends this account email?".
 *
 * Administrators configure one OTP sender in the admin panel; every
 * authentication message that carries a code — signup verification, email-code
 * second factors, password-reset codes and the per-user email MFA codes — goes
 * through it. Keeping the resolution in one function is what makes "the
 * configured sender is used" a structural guarantee instead of a per-call-site
 * convention: there is no scenario-specific sender to forget.
 */
export type AuthEmailPurpose =
  | "SIGNUP_VERIFY"
  | "PASSWORD_RESET"
  | "LOGIN_MFA"
  | "ADMIN_LOGIN"
  | "EMAIL_MFA_ENROLL";

export type ResolvedAuthSender = {
  providerConfig: EmailProviderConfig | null;
  fromName?: string;
  /** Configured Email Account, when one was selected. */
  accountId: string | null;
  /** From address actually used, for diagnostics and the settings screen. */
  from: string | null;
  /** `account` = configured Email Account, `env` = RESEND_API_KEY fallback. */
  source: "account" | "env" | "none";
};

function envResendConfig(): EmailProviderConfig | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  const from =
    process.env.EMAIL_FROM?.trim() || process.env.SEED_COMPANY_EMAIL?.trim() || "noreply@localhost";
  return { provider: "resend", from, resendApiKey: key };
}

function usableFromName(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Resolve the sender for an authentication email.
 *
 * Order:
 * 1. The OTP sender selected by an administrator (`adminAuth.otpEmailAccountId`).
 * 2. The account selected for the specific flow (signup verification / customer
 *    password reset), for sites that still use the legacy per-flow selectors.
 * 3. RESEND_API_KEY, so a partially configured site still delivers mail.
 *
 * A selected-but-broken Email Account never silently falls through to a
 * different sender: that would put authentication mail on a mailbox the
 * operator did not choose. Only "nothing selected" falls back.
 */
export async function resolveAuthEmailSender(
  purpose: AuthEmailPurpose,
  settingsInput?: AccountSettings,
): Promise<ResolvedAuthSender> {
  const settings = settingsInput ?? (await accountSettingsService.get());

  const candidates: Array<{ id: string; fromName?: string }> = [];
  const otpAccountId = settings.adminAuth.otpEmailAccountId?.trim();
  if (otpAccountId) candidates.push({ id: otpAccountId });

  const flowAccountId =
    purpose === "SIGNUP_VERIFY"
      ? settings.emailVerification.emailAccountId?.trim()
      : purpose === "PASSWORD_RESET"
        ? settings.passwordReset.emailAccountId?.trim()
        : undefined;
  if (flowAccountId && flowAccountId !== otpAccountId) {
    candidates.push({ id: flowAccountId });
  }

  for (const candidate of candidates) {
    const record = await getEmailAccountRecord(candidate.id);
    if (!record || !isEmailAccountConfigured(record)) continue;
    const providerConfig = await resolveEmailProviderConfig(candidate.id);
    if (!providerConfig) continue;
    return {
      providerConfig,
      fromName: fromNameFor(purpose, settings),
      accountId: candidate.id,
      from: providerConfig.from,
      source: "account",
    };
  }

  const env = envResendConfig();
  if (env) {
    return {
      providerConfig: env,
      fromName: fromNameFor(purpose, settings),
      accountId: null,
      from: env.from,
      source: "env",
    };
  }

  return {
    providerConfig: null,
    fromName: fromNameFor(purpose, settings),
    accountId: null,
    from: null,
    source: "none",
  };
}

function fromNameFor(purpose: AuthEmailPurpose, settings: AccountSettings): string | undefined {
  switch (purpose) {
    case "SIGNUP_VERIFY":
      return usableFromName(settings.emailVerification.fromName);
    case "PASSWORD_RESET":
      return usableFromName(settings.passwordReset.fromName);
    default:
      return (
        usableFromName(settings.emailVerification.fromName) ??
        usableFromName(settings.passwordReset.fromName)
      );
  }
}

/** True when the site can deliver authentication email at all. */
export async function isAuthEmailDeliveryConfigured(
  settingsInput?: AccountSettings,
): Promise<boolean> {
  const sender = await resolveAuthEmailSender("PASSWORD_RESET", settingsInput);
  return sender.providerConfig != null;
}
