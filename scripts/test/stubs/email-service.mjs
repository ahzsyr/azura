/**
 * Test double for `@/features/email/email.service`.
 *
 * Records the message that would have gone out (recipient, subject, From
 * address and which provider config produced it) and reports success, so the
 * auth/account services can be exercised end-to-end without a provider.
 * Reading this list proves *which mailbox* received a reset code.
 */

export const sentEmails = [];

export function resetSentEmails() {
  sentEmails.length = 0;
}

export async function sendEmail(input) {
  if (!input.providerConfig) {
    return { sent: false, errorCode: "not_configured", errorMessage: "No provider configured" };
  }
  sentEmails.push({
    to: Array.isArray(input.to) ? input.to.join(",") : input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    from: input.providerConfig.from,
    provider: input.providerConfig.provider,
    providerConfig: input.providerConfig,
  });
  return { sent: true };
}

/** Legacy env-only resolver; tests configure the Email Accounts store instead. */
export async function resolveSendProviderConfig() {
  return null;
}

export function getEmailDeliveryStatusFromEnv() {
  return { configured: false, provider: "none", from: "noreply@localhost", source: "none" };
}

export function getEmailDeliveryStatus() {
  return getEmailDeliveryStatusFromEnv();
}

export async function getEmailDeliveryStatusForAccount() {
  return { configured: false, provider: "none", from: "noreply@localhost", source: "none" };
}
