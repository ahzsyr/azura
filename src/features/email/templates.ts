import "server-only";

import {
  sendEmail,
  resolveSendProviderConfig,
  type SendEmailResult,
} from "@/features/email/email.service";
import type { EmailProviderConfig } from "@/features/email/email-accounts.types";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";

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

  const html = useArabicCopy
    ? `<p>${greeting}،</p><p>يرجى تأكيد اشتراكك بالنقر على الرابط:</p><p><a href="${input.confirmUrl}">تأكيد الاشتراك</a></p>`
    : `<p>${greeting},</p><p>Please confirm your subscription by clicking the link below:</p><p><a href="${input.confirmUrl}">Confirm subscription</a></p>`;

  return sendEmail({ to: input.to, subject, html, text: confirmUrlText(input.confirmUrl) });
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

  const formatCell = (value: unknown): string => {
    const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const toAbsolute = (url: string) => {
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("/") && siteOrigin) return `${siteOrigin}${url}`;
      return url;
    };

    if (value == null || value === "") return "";
    if (typeof value === "string") {
      if (
        value.startsWith("/uploads/") ||
        /^https?:\/\//i.test(value) ||
        /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|zip)(\?|#|$)/i.test(value)
      ) {
        const href = toAbsolute(value);
        const name = value.split("/").pop()?.split("?")[0] || "Attachment";
        return `<a href="${escapeHtml(href)}">${escapeHtml(name)}</a>`;
      }
      return escapeHtml(value);
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const url =
        (typeof record.url === "string" && record.url) ||
        (typeof record.href === "string" && record.href) ||
        null;
      if (url) {
        const href = toAbsolute(url);
        const name =
          (typeof record.name === "string" && record.name) ||
          (typeof record.filename === "string" && record.filename) ||
          url.split("/").pop() ||
          "Attachment";
        return `<a href="${escapeHtml(href)}">${escapeHtml(name)}</a>`;
      }
    }
    if (Array.isArray(value)) {
      return value.map((v) => formatCell(v)).join("<br/>");
    }
    return escapeHtml(String(value));
  };

  const rows = Object.entries(input.payload)
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${formatCell(v)}</td></tr>`)
    .join("");

  const html = `
    <h2>New form submission: ${escapeHtml(input.templateName)}</h2>
    <p><strong>Reference:</strong> ${escapeHtml(reference)}</p>
    <p>Submission ID: ${escapeHtml(input.submissionId)} | Score: ${input.score}</p>
    <table border="1" cellpadding="6">${rows}</table>
  `;

  return sendEmail({
    to: input.to,
    subject: `New submission ${reference}: ${input.templateName}`,
    html,
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
  const referenceLine = reference
    ? `<p>Your reference number is <strong>${reference}</strong>. Please keep it for your records.</p>`
    : "";
  const html = `
    <p>Thank you for contacting us via <strong>${input.templateName}</strong>. We will get back to you soon.</p>
    ${referenceLine}
  `;
  return sendEmail({
    to: input.to,
    subject: reference
      ? `We received your message (${reference})`
      : "We received your message",
    html,
    providerConfig: input.providerConfig,
  });
}

export async function sendFormNotificationTest(input: {
  to: string[];
  templateName?: string;
  accountId?: string | null;
}): Promise<SendEmailResult> {
  const name = input.templateName?.trim() || "Form";
  const html = `
    <h2>Test form notification</h2>
    <p>This is a test email for <strong>${name}</strong>.</p>
    <p>If you received this, your email provider and receiver address are working.</p>
  `;
  const providerConfig = await resolveSendProviderConfig(input.accountId);
  return sendEmail({
    to: input.to,
    subject: `Test notification: ${name}`,
    html,
    text: `Test form notification for ${name}. If you received this, delivery is working.`,
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
  const safeBody = input.body
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");
  const html = `
    <p>Re: your message via <strong>${escapeHtml(input.templateName)}</strong></p>
    ${safeBody}
  `;
  return sendEmail({
    to: input.to,
    subject: input.subject,
    html,
    text: input.body,
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
  const safeBody = input.body
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");
  const html = `
    <p>Forwarded form submission from <strong>${escapeHtml(input.templateName)}</strong></p>
    ${safeBody}
  `;
  return sendEmail({
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    html,
    text: input.body,
    providerConfig: input.providerConfig,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function confirmUrlText(url: string) {
  return `Confirm your subscription: ${url}`;
}
