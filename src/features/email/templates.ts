import "server-only";

import { sendEmail } from "@/features/email/email.service";

export async function sendNewsletterConfirmation(input: {
  to: string;
  name?: string;
  confirmUrl: string;
  locale: string;
}) {
  const greeting = input.locale.startsWith("ar")
    ? `مرحباً${input.name ? ` ${input.name}` : ""}`
    : `Hello${input.name ? ` ${input.name}` : ""}`;

  const subject = input.locale.startsWith("ar")
    ? "تأكيد الاشتراك في النشرة البريدية"
    : "Confirm your newsletter subscription";

  const html = input.locale.startsWith("ar")
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
}) {
  const rows = Object.entries(input.payload)
    .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${String(v ?? "")}</td></tr>`)
    .join("");

  const html = `
    <h2>New form submission: ${input.templateName}</h2>
    <p>Submission ID: ${input.submissionId} | Score: ${input.score}</p>
    <table border="1" cellpadding="6">${rows}</table>
  `;

  return sendEmail({
    to: input.to,
    subject: `New submission: ${input.templateName}`,
    html,
  });
}

export async function sendFormSubmitterReply(input: { to: string; templateName: string }) {
  const html = `<p>Thank you for contacting us via <strong>${input.templateName}</strong>. We will get back to you soon.</p>`;
  return sendEmail({
    to: input.to,
    subject: "We received your message",
    html,
  });
}

function confirmUrlText(url: string) {
  return `Confirm your subscription: ${url}`;
}
