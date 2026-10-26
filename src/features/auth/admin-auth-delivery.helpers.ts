/**
 * Pure sendability checks for email-code (OTP) delivery (unit-testable).
 * Server helpers use these after resolving the site-wide authentication
 * sender, so a code can only be "enabled" when a mailbox can actually send it.
 */

export type EmailAccountSendabilityInput = {
  /** The site-wide authentication Email Account row exists */
  accountExists: boolean;
  /** isEmailAccountConfigured(record) */
  accountConfigured: boolean;
  /** resolveEmailProviderConfig succeeded */
  providerResolved: boolean;
};

export function evaluateAdminEmailMfaConfigured(input: EmailAccountSendabilityInput): boolean {
  if (!input.accountExists) return false;
  if (!input.accountConfigured) return false;
  if (!input.providerResolved) return false;
  return true;
}
