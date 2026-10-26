import "server-only";

import type { EmailAccountPublic, EmailProviderConfig } from "@/features/email/email-accounts.types";
import {
  getEmailAccountRecord,
  isEmailAccountConfigured,
  listEmailAccounts,
  resolveEmailProviderConfig,
} from "@/features/email/email-accounts.service";

/**
 * The site-wide authentication sender ("Email delivery").
 *
 * Every code and link that proves who someone is — signup verification, email
 * sign-in codes, two-step codes and password-reset codes, for customers,
 * Admins and the Super Admin alike — leaves through ONE mailbox: the Email
 * Account an administrator selects in Settings → Email Accounts → Email
 * delivery. The selection is a site setting (`accountSettings.emailDelivery`),
 * so it is never per-role and never personal to the admin who saved it.
 *
 * Resolution order for `authEmailAccountId`:
 * 1. the explicitly selected Email Account;
 * 2. the only sendable Email Account, when exactly one exists (a single-account
 *    site always uses the mailbox an admin just configured and tested);
 * 3. nothing — and then a failure is reported honestly instead of the code
 *    vanishing into a mailbox nobody chose.
 */

export type AuthDeliveryState = {
  /** Account every authentication email is sent through. `null` = none usable. */
  account: EmailAccountPublic | null;
  /** Account id stored by an administrator (may be missing/incomplete). */
  selectedId: string | null;
  /** Why no sender is available, for the admin UI. */
  reason:
    | "ready"
    | "no_accounts"
    | "not_selected_multiple"
    | "selected_missing"
    | "selected_incomplete";
};

function sendable(account: EmailAccountPublic): boolean {
  return account.provider === "resend"
    ? account.hasResendApiKey
    : account.provider === "smtp" && account.hasSmtpCredentials;
}

export async function describeAuthEmailDelivery(
  authEmailAccountId: string | null | undefined,
): Promise<AuthDeliveryState> {
  const selectedId = authEmailAccountId?.trim() || null;
  const accounts = await listEmailAccounts();

  if (selectedId) {
    const record = await getEmailAccountRecord(selectedId);
    if (!record) return { account: null, selectedId, reason: "selected_missing" };
    const account = accounts.find((a) => a.id === record.id) ?? null;
    if (!account || !isEmailAccountConfigured(record) || !sendable(account)) {
      return { account: null, selectedId, reason: "selected_incomplete" };
    }
    return { account, selectedId, reason: "ready" };
  }

  if (accounts.length === 0) return { account: null, selectedId: null, reason: "no_accounts" };
  const usable = accounts.filter(sendable);
  if (usable.length === 1) return { account: usable[0], selectedId: null, reason: "ready" };
  return {
    account: null,
    selectedId: null,
    reason: usable.length === 0 ? "no_accounts" : "not_selected_multiple",
  };
}

export type AuthSender = {
  providerConfig: EmailProviderConfig | null;
  accountId: string | null;
  from: string | null;
  /** `account` = the site-wide Email Account, `env` = RESEND_API_KEY fallback, `none`. */
  source: "account" | "env" | "none";
  /** Human-readable cause when `source` is `none`, for admin feedback and audits. */
  reason: AuthDeliveryState["reason"] | "env_unset" | null;
};

function envResendConfig(): EmailProviderConfig | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  const from =
    process.env.EMAIL_FROM?.trim() || process.env.SEED_COMPANY_EMAIL?.trim() || "noreply@localhost";
  return { provider: "resend", from, resendApiKey: key };
}

/**
 * Resolve the sender for an authentication email.
 *
 * A selected-but-broken Email Account never silently falls through to a
 * different mailbox: that would put authentication mail on an address nobody
 * chose. The RESEND_API_KEY env fallback is reserved for sites that have no
 * Email Account at all — once accounts exist, authentication mail goes
 * through one of them or not at all, so a "test email works" account and a
 * silently-different code sender can never coexist.
 */
export async function resolveAuthSender(
  authEmailAccountId: string | null | undefined,
): Promise<AuthSender> {
  const state = await describeAuthEmailDelivery(authEmailAccountId);
  if (state.account) {
    const providerConfig = await resolveEmailProviderConfig(state.account.id);
    if (providerConfig) {
      return {
        providerConfig,
        accountId: state.account.id,
        from: providerConfig.from,
        source: "account",
        reason: "ready",
      };
    }
    return { providerConfig: null, accountId: state.account.id, from: null, source: "none", reason: "selected_incomplete" };
  }

  // A missing or incomplete explicit choice is an error, never "use something else".
  if (state.selectedId) {
    return { providerConfig: null, accountId: state.selectedId, from: null, source: "none", reason: state.reason };
  }

  // Accounts exist but none is usable/selected: never divert to env.
  if (state.reason !== "no_accounts") {
    return { providerConfig: null, accountId: null, from: null, source: "none", reason: state.reason };
  }

  const env = envResendConfig();
  if (env) {
    return { providerConfig: env, accountId: null, from: env.from, source: "env", reason: null };
  }
  return { providerConfig: null, accountId: null, from: null, source: "none", reason: "env_unset" };
}
