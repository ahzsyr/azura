import "server-only";

import { accountSettingsService } from "@/features/account/account-settings.service";
import { resolveEmailProviderConfig } from "@/features/email/email-accounts.service";
import { describeAuthEmailDelivery } from "@/features/email/email-delivery";
import { evaluateAdminEmailMfaConfigured } from "@/features/auth/admin-auth-delivery.helpers";

/**
 * Email-code second factors are available whenever the site has a usable
 * authentication sender — the Email Account chosen under Settings → Email
 * Accounts → Email delivery. The sender applies to every account (customers,
 * Admins and the Super Admin), not just to the admin who configured it.
 *
 * The function names keep their historical `Admin` prefix because the
 * sign-in challenge, the admin lifecycle gate and the admin dashboard all
 * consult them; the behaviour is site-wide.
 */
export async function isAdminEmailMfaConfigured(): Promise<boolean> {
  const settings = await accountSettingsService.get();
  const state = await describeAuthEmailDelivery(settings.emailDelivery?.emailAccountId);
  return evaluateAdminEmailMfaConfigured({
    accountExists: state.account != null,
    accountConfigured: state.account != null,
    providerResolved: state.account != null,
  });
}

/**
 * Resolve the sendable provider for a sign-in code. Uses the same site-wide
 * sender as every other authentication email, so a failed sign-in code is
 * never the result of a mailbox that only exists for the admin panel.
 *
 * @deprecated Sign-in mail resolves through `resolveAuthEmailSender("ADMIN_LOGIN")`
 * directly; kept for callers written against the old admin-only path.
 */
export async function resolveAdminOtpProviderConfig() {
  const settings = await accountSettingsService.get();
  const state = await describeAuthEmailDelivery(settings.emailDelivery?.emailAccountId);
  if (!state.account) return null;
  return resolveEmailProviderConfig(state.account.id);
}

/** Delivery status for the Email Accounts screen and the admin account tab. */
export async function getAdminAuthDeliveryStatus(): Promise<{
  mfaEnabled: boolean;
  hasEmailAccounts: boolean;
  otpEmailAccountId: string | null;
  reason: Awaited<ReturnType<typeof describeAuthEmailDelivery>>["reason"];
}> {
  const settings = await accountSettingsService.get();
  const state = await describeAuthEmailDelivery(settings.emailDelivery?.emailAccountId);
  return {
    mfaEnabled: state.account != null,
    hasEmailAccounts: state.reason !== "no_accounts",
    otpEmailAccountId: state.account?.id ?? state.selectedId,
    reason: state.reason,
  };
}
