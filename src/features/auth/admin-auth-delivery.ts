import "server-only";

import { accountSettingsService } from "@/features/account/account-settings.service";
import {
  getEmailAccountRecord,
  isEmailAccountConfigured,
  listEmailAccounts,
  resolveEmailProviderConfig,
} from "@/features/email/email-accounts.service";
import { evaluateAdminEmailMfaConfigured } from "@/features/auth/admin-auth-delivery.helpers";

/**
 * Admin MFA (email OTP) is ON only when a Master-Admin-selected OTP Email Account
 * exists and is sendable. Env-only Resend/SMTP does not enable MFA.
 */
export async function isAdminEmailMfaConfigured(): Promise<boolean> {
  const accounts = await listEmailAccounts();
  const settings = await accountSettingsService.get();
  const accountId = settings.adminAuth.otpEmailAccountId?.trim() || "";
  const record = accountId ? await getEmailAccountRecord(accountId) : null;
  const provider = accountId ? await resolveEmailProviderConfig(accountId) : null;

  return evaluateAdminEmailMfaConfigured({
    accountCount: accounts.length,
    otpEmailAccountId: accountId,
    accountExists: Boolean(record),
    accountConfigured: record ? isEmailAccountConfigured(record) : false,
    providerResolved: provider != null,
  });
}

/** Resolve sendable provider for admin login OTP only (never portal customer senders). */
export async function resolveAdminOtpProviderConfig() {
  const settings = await accountSettingsService.get();
  const accountId = settings.adminAuth.otpEmailAccountId?.trim();
  if (!accountId) return null;
  if (!(await isAdminEmailMfaConfigured())) return null;
  return resolveEmailProviderConfig(accountId);
}

/** Resolve sendable provider for admin password-reset emails only. */
export async function resolveAdminPasswordResetProviderConfig() {
  const settings = await accountSettingsService.get();
  const accountId = settings.adminAuth.passwordResetEmailAccountId?.trim();
  if (!accountId) return null;

  const record = await getEmailAccountRecord(accountId);
  if (!record || !isEmailAccountConfigured(record)) return null;
  return resolveEmailProviderConfig(accountId);
}

export async function getAdminAuthDeliveryStatus(): Promise<{
  mfaEnabled: boolean;
  hasEmailAccounts: boolean;
  otpEmailAccountId: string | null;
  passwordResetEmailAccountId: string | null;
}> {
  const settings = await accountSettingsService.get();
  const accounts = await listEmailAccounts();
  return {
    mfaEnabled: await isAdminEmailMfaConfigured(),
    hasEmailAccounts: accounts.length > 0,
    otpEmailAccountId: settings.adminAuth.otpEmailAccountId?.trim() || null,
    passwordResetEmailAccountId:
      settings.adminAuth.passwordResetEmailAccountId?.trim() || null,
  };
}
