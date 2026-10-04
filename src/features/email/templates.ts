import "server-only";

import {
  sendEmail,
  resolveSendProviderConfig,
  type SendEmailResult,
} from "@/features/email/email.service";
import type { EmailProviderConfig } from "@/features/email/email-accounts.types";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";
import {
  renderFormAdminNotification,
  renderFormNotificationTest,
  renderFormSubmissionAdminReply,
  renderFormSubmissionForward,
  renderFormSubmitterReply,
  renderNewsletterConfirmation,
} from "@/features/email/react-templates";

export async function sendNewsletterConfirmation(input: {
  to: string;
  name?: string;
  confirmUrl: string;
  locale: string;
}) {
  const useArabicCopy = isArabicLocale(input.locale);

  const greeting = useArabicCopy
    ? `مرحباً${input.name ? ` ${input.name}` : ""}`
    : `Hello${input.name ? ` ${input.name}` : ""}`;

  const subject = useArabicCopy
    ? "تأكيد الاشتراك في النشرة البريدية"
    : "Confirm your newsletter subscription";

  const { html, text } = await renderNewsletterConfirmation({
    greeting,
    confirmUrl: input.confirmUrl,
    useArabicCopy,
  });

  return sendEmail({
    to: input.to,
    subject,
    html,
    text: text ?? `Confirm your subscription: ${input.confirmUrl}`,
  });
}

export async function sendFormAdminNotification(input: {
  to: string[];
  templateName: string;
  payload: Record<string, unknown>;
  submissionId: string;
  score: number;
  replyTo?: string;
  providerConfig?: EmailProviderConfig | null;
}): Promise<SendEmailResult> {
  const { formatSubmissionReference } = await import("@/features/forms/lib/submission-contact");
  const reference = formatSubmissionReference(input.submissionId);

  const { html, text } = await renderFormAdminNotification({
    templateName: input.templateName,
    reference,
    submissionId: input.submissionId,
    score: input.score,
    payload: input.payload,
  });

  return sendEmail({
    to: input.to,
    subject: `New submission ${reference}: ${input.templateName}`,
    html,
    text,
    replyTo: input.replyTo,
    providerConfig: input.providerConfig,
  });
}

export async function sendFormSubmitterReply(input: {
  to: string;
  templateName: string;
  submissionId?: string;
  providerConfig?: EmailProviderConfig | null;
}): Promise<SendEmailResult> {
  const { formatSubmissionReference } = await import("@/features/forms/lib/submission-contact");
  const reference = input.submissionId
    ? formatSubmissionReference(input.submissionId)
    : null;
  const { html, text } = await renderFormSubmitterReply({
    templateName: input.templateName,
    reference,
  });
  return sendEmail({
    to: input.to,
    subject: reference
      ? `We received your message (${reference})`
      : "We received your message",
    html,
    text,
    providerConfig: input.providerConfig,
  });
}

export async function sendFormNotificationTest(input: {
  to: string[];
  templateName?: string;
  accountId?: string | null;
}): Promise<SendEmailResult> {
  const name = input.templateName?.trim() || "Form";
  const { html, text } = await renderFormNotificationTest({ templateName: name });
  const providerConfig = await resolveSendProviderConfig(input.accountId);
  return sendEmail({
    to: input.to,
    subject: `Test notification: ${name}`,
    html,
    text:
      text ??
      `Test form notification for ${name}. If you received this, delivery is working.`,
    providerConfig,
  });
}

export async function sendFormSubmissionAdminReply(input: {
  to: string;
  subject: string;
  body: string;
  templateName: string;
  providerConfig?: EmailProviderConfig | null;
}): Promise<SendEmailResult> {
  const { html, text } = await renderFormSubmissionAdminReply({
    templateName: input.templateName,
    body: input.body,
  });
  return sendEmail({
    to: input.to,
    subject: input.subject,
    html,
    text,
    providerConfig: input.providerConfig,
  });
}

export async function sendFormSubmissionForward(input: {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  templateName: string;
  providerConfig?: EmailProviderConfig | null;
}): Promise<SendEmailResult> {
  const { html, text } = await renderFormSubmissionForward({
    templateName: input.templateName,
    body: input.body,
  });
  return sendEmail({
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    html,
    text,
    providerConfig: input.providerConfig,
  });
}
