import "server-only";

import { Resend } from "resend";
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
  /** Optional display name for the From header. */
  fromName?: string;
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
  provider: "resend" | "none";
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
        "Select an email account or configure one under Settings → Email Accounts (env RESEND_API_KEY is a fallback).",
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
      provider: configured ? "resend" : "none",
      from: record.from,
      source: "account",
      accountId: record.id,
      accountName: record.name,
      message: configured
        ? undefined
        : record.provider === "smtp"
          ? "SMTP accounts are no longer supported. Recreate this account with Resend under Settings → Email Accounts."
          : "This email account is missing credentials. Edit it under Settings → Email Accounts.",
    };
  }
  return getEmailDeliveryStatusFromEnv();
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
  return "Email delivery failed. Reason: No email provider configured. Select an email account on the form, or configure Settings → Email Accounts (or RESEND_API_KEY).";
}

function formatFromAddress(from: string, fromName?: string): string {
  const name = fromName?.trim();
  if (!name) return from;
  const emailMatch = from.match(/<([^>]+)>/);
  const email = (emailMatch?.[1] ?? from).trim();
  const safeName = name.replace(/"/g, "");
  return `"${safeName}" <${email}>`;
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

  if (config.provider !== "resend" || !config.resendApiKey) {
    const errorMessage = notConfiguredMessage();
    console.error("[email] delivery failed", { errorCode: "not_configured", errorMessage, to });
    return { sent: false, errorCode: "not_configured", errorMessage };
  }

  const from = formatFromAddress(config.from, input.fromName);

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

/** Resolve accountId → provider config, falling back to env when unset or unresolved. */
export async function resolveSendProviderConfig(
  accountId?: string | null,
): Promise<EmailProviderConfig | null> {
  const fromAccount = await resolveEmailProviderConfig(accountId);
  if (fromAccount) return fromAccount;
  return getEnvProviderConfig();
}
