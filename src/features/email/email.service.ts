import "server-only";

import { Resend } from "resend";
import type nodemailer from "nodemailer";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? process.env.SEED_COMPANY_EMAIL ?? "noreply@localhost";
}

let smtpTransport: nodemailer.Transporter | null = null;

async function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host) return null;
  const nodemailerModule = await import("nodemailer");
  smtpTransport = nodemailerModule.default.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  return smtpTransport;
}

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; devLog?: string }> {
  const from = getFromAddress();
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { sent: true };
  }

  const transport = await getSmtpTransport();
  if (transport) {
    await transport.sendMail({
      from,
      to: to.join(", "),
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { sent: true };
  }

  const devLog = `[email:dev] To: ${to.join(", ")} | Subject: ${input.subject}\n${input.text ?? input.html}`;
  console.info(devLog);
  return { sent: false, devLog };
}
