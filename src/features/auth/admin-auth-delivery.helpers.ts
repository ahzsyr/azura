/**
 * Pure sendability checks for admin MFA delivery (unit-testable).
 * Server helper isAdminEmailMfaConfigured uses these after loading store data.
 */

export type EmailAccountSendabilityInput = {
  /** At least one Email Account in the store */
  accountCount: number;
  /** Selected admin OTP Email Account id */
  otpEmailAccountId: string | null | undefined;
  /** Whether the selected account row exists */
  accountExists: boolean;
  /** isEmailAccountConfigured(record) */
  accountConfigured: boolean;
  /** resolveEmailProviderConfig succeeded */
  providerResolved: boolean;
};

export function evaluateAdminEmailMfaConfigured(input: EmailAccountSendabilityInput): boolean {
  if (input.accountCount <= 0) return false;
  if (!input.otpEmailAccountId?.trim()) return false;
  if (!input.accountExists) return false;
  if (!input.accountConfigured) return false;
  if (!input.providerResolved) return false;
  return true;
}
