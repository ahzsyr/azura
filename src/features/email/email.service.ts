import "server-only";

import { Resend } from "resend";
import type nodemailer from "nodemailer";
import type { EmailProviderConfig } from "@/features/email/email-accounts.types";
import {
  getEmailAccountRecord,
  isEmailAccountConfigured,
  resolveEmailProviderConfig,
} from "@/features/email/email-accounts.service";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  /** When set, use this account instead of env fallback. */
  providerConfig?: EmailProviderConfig | null;
};

export type EmailErrorCode = "not_configured" | "provider_error";

export type SendEmailResult = {
  sent: boolean;
  errorCode?: EmailErrorCode;
  errorMessage?: string;
  /** Present when falling back to console in development. */
  devLog?: string;
};

export type EmailDeliveryStatus = {
  configured: boolean;
  provider: "resend" | "smtp" | "none";
  from: string;
  /** How delivery was resolved. */
  source: "account" | "env" | "none";
  accountId?: string;
  accountName?: string;
  message?: string;
};

function getEnvFromAddress(): string {
  return process.env.EMAIL_FROM ?? process.env.SEED_COMPANY_EMAIL ?? "noreply@localhost";
}

function getEnvProviderConfig(): EmailProviderConfig | null {
  if (process.env.RESEND_API_KEY?.trim()) {
    return {
      provider: "resend",
      from: getEnvFromAddress(),
      resendApiKey: process.env.RESEND_API_KEY.trim(),
    };
  }
  if (process.env.SMTP_HOST?.trim()) {
    return {
      provider: "smtp",
      from: getEnvFromAddress(),
      smtp: {
        host: process.env.SMTP_HOST.trim(),
        port: Number(process.env.SMTP_PORT ?? 587) || 587,
        user: process.env.SMTP_USER?.trim() || undefined,
        pass: process.env.SMTP_PASS?.trim() || undefined,
      },
    };
  }
  return null;
}

export function getEmailDeliveryStatusFromEnv(): EmailDeliveryStatus {
  const env = getEnvProviderConfig();
  if (!env) {
    return {
      configured: false,
      provider: "none",
      from: getEnvFromAddress(),
      source: "none",
      message:
        "Select an email account or configure one under Settings → Email Accounts (env RESEND_API_KEY / SMTP_HOST is a fallback).",
    };
  }
  return {
    configured: true,
    provider: env.provider,
    from: env.from,
    source: "env",
  };
}

/** Sync env-only status (legacy callers). Prefer getEmailDeliveryStatusForAccount. */
export function getEmailDeliveryStatus(): EmailDeliveryStatus {
  return getEmailDeliveryStatusFromEnv();
}

export async function getEmailDeliveryStatusForAccount(
  accountId?: string | null,
): Promise<EmailDeliveryStatus> {
  if (accountId?.trim()) {
    const record = await getEmailAccountRecord(accountId.trim());
    if (!record) {
      return {
        configured: false,
        provider: "none",
        from: getEnvFromAddress(),
        source: "none",
        accountId: accountId.trim(),
        message: "Selected email account was not found. Choose another or create one under Settings → Email Accounts.",
      };
    }
    const configured = isEmailAccountConfigured(record);
    return {
      configured,
      provider: configured ? record.provider : "none",
      from: record.from,
      source: "account",
      accountId: record.id,
      accountName: record.name,
      message: configured
        ? undefined
        : "This email account is missing credentials. Edit it under Settings → Email Accounts.",
    };
  }
  return getEmailDeliveryStatusFromEnv();
}

async function createSmtpTransport(smtp: NonNullable<EmailProviderConfig["smtp"]>) {
  const nodemailerModule = await import("nodemailer");
  return nodemailerModule.default.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
}

function providerErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const withResponse = err as Error & { response?: string; statusCode?: number };
    if (withResponse.response) return withResponse.response;
    return err.message;
  }
  return String(err);
}

function notConfiguredMessage(): string {
  return "Email delivery failed. Reason: No email provider configured. Select an email account on the form, or configure Settings → Email Accounts (or RESEND_API_KEY / SMTP_HOST).";
}

function normalizeRecipients(value?: string | string[]): string[] | undefined {
  if (value == null) return undefined;
  const list = (Array.isArray(value) ? value : [value])
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry.includes("@"));
  return list.length > 0 ? list : undefined;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const cc = normalizeRecipients(input.cc);
  const bcc = normalizeRecipients(input.bcc);
  const config = input.providerConfig ?? getEnvProviderConfig();

  if (!config) {
    const errorMessage = notConfiguredMessage();
    const devLog = `[email:not_configured] To: ${to.join(", ")} | Subject: ${input.subject}\n${input.text ?? input.html}`;
    console.error("[email] delivery failed", { errorCode: "not_configured", errorMessage, to });
    console.info(devLog);
    return { sent: false, errorCode: "not_configured", errorMessage, devLog };
  }

  const from = config.from;

  if (config.provider === "resend") {
    if (!config.resendApiKey) {
      const errorMessage = notConfiguredMessage();
      console.error("[email] delivery failed", { errorCode: "not_configured", errorMessage, to });
      return { sent: false, errorCode: "not_configured", errorMessage };
    }
    try {
      const resend = new Resend(config.resendApiKey);
      const { error } = await resend.emails.send({
        from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
        ...(cc ? { cc } : {}),
        ...(bcc ? { bcc } : {}),
      });
      if (error) {
        const errorMessage = `Resend API returned: ${error.message}`;
        console.error("[email] delivery failed", { errorCode: "provider_error", errorMessage, to });
        return { sent: false, errorCode: "provider_error", errorMessage };
      }
      return { sent: true };
    } catch (err) {
      const errorMessage = `Resend API returned: ${providerErrorMessage(err)}`;
      console.error("[email] delivery failed", { errorCode: "provider_error", errorMessage, to });
      return { sent: false, errorCode: "provider_error", errorMessage };
    }
  }

  if (config.provider === "smtp") {
    if (!config.smtp?.host) {
      const errorMessage = notConfiguredMessage();
      console.error("[email] delivery failed", { errorCode: "not_configured", errorMessage, to });
      return { sent: false, errorCode: "not_configured", errorMessage };
    }
    try {
      const transport = await createSmtpTransport(config.smtp);
      await transport.sendMail({
        from,
        to: to.join(", "),
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
        ...(cc ? { cc: cc.join(", ") } : {}),
        ...(bcc ? { bcc: bcc.join(", ") } : {}),
      });
      return { sent: true };
    } catch (err) {
      const detail = providerErrorMessage(err);
      const errorMessage = detail.toLowerCase().includes("auth")
        ? `SMTP authentication failed. ${detail}`
        : `SMTP delivery failed. ${detail}`;
      console.error("[email] delivery failed", { errorCode: "provider_error", errorMessage, to });
      return { sent: false, errorCode: "provider_error", errorMessage };
    }
  }

  const errorMessage = notConfiguredMessage();
  console.error("[email] delivery failed", { errorCode: "not_configured", errorMessage, to });
  return { sent: false, errorCode: "not_configured", errorMessage };
}

/** Resolve accountId → provider config, falling back to env when unset or unresolved. */
export async function resolveSendProviderConfig(
  accountId?: string | null,
): Promise<EmailProviderConfig | null> {
  const fromAccount = await resolveEmailProviderConfig(accountId);
  if (fromAccount) return fromAccount;
  return getEnvProviderConfig();
}
