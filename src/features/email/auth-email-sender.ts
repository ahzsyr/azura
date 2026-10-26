import "server-only";

import { accountSettingsService, type AccountSettings } from "@/features/account/account-settings.service";
import type { EmailProviderConfig } from "@/features/email/email-accounts.types";
import {
  describeAuthEmailDelivery,
  resolveAuthSender,
  type AuthDeliveryState,
} from "@/features/email/email-delivery";

/**
 * Single place that answers "which mailbox sends this account email?".
 *
 * Administrators configure one sender under Settings → Email Accounts → Email
 * delivery; every authentication message that carries a code — signup
 * verification, email-code second factors, password-reset codes and the
 * per-user email MFA codes — goes through it, for every role. Keeping the
 * resolution in one function is what makes "the configured sender is used" a
 * structural guarantee instead of a per-call-site convention: there is no
 * scenario-specific sender to forget, and no role-specific exception.
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
  /** Why delivery is unavailable when `source` is `none`. */
  reason: AuthDeliveryState["reason"] | "env_unset" | null;
};

function usableFromName(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Resolve the sender for an authentication email.
 *
 * The account comes from `settings.emailDelivery.emailAccountId` — never from
 * a per-flow selector or the signed-in admin — and the fallback is only the
 * RESEND_API_KEY environment variable on sites that never configured an
 * account. A selected-but-broken Email Account is an error: authentication
 * mail is never silently moved to a mailbox the operator did not choose.
 */
export async function resolveAuthEmailSender(
  purpose: AuthEmailPurpose,
  settingsInput?: AccountSettings,
): Promise<ResolvedAuthSender> {
  const settings = settingsInput ?? (await accountSettingsService.get());
  const sender = await resolveAuthSender(settings.emailDelivery?.emailAccountId);

  return {
    providerConfig: sender.providerConfig,
    fromName: fromNameFor(purpose, settings),
    accountId: sender.accountId,
    from: sender.from,
    source: sender.source,
    reason: sender.reason,
  };
}

export function fromNameFor(purpose: AuthEmailPurpose, settings: AccountSettings): string | undefined {
  const delivery = usableFromName(settings.emailDelivery?.fromName);
  switch (purpose) {
    case "SIGNUP_VERIFY":
      return delivery ?? usableFromName(settings.emailVerification.fromName);
    case "PASSWORD_RESET":
      return delivery ?? usableFromName(settings.passwordReset.fromName);
    default:
      return (
        delivery ??
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

/** Admin-facing description of the configured sender. */
export async function getAuthEmailDeliveryState(
  settingsInput?: AccountSettings,
): Promise<AuthDeliveryState> {
  const settings = settingsInput ?? (await accountSettingsService.get());
  return describeAuthEmailDelivery(settings.emailDelivery?.emailAccountId);
}
