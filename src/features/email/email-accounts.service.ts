import "server-only";

import { randomUUID } from "crypto";
import { jsonStoreService } from "@/features/storage/json-store.service";
import { sealSecret, unsealSecret } from "@/features/seo/integrations/secret-seal.server";
import { prisma } from "@/lib/prisma";
import type {
  EmailAccountPublic,
  EmailAccountRecord,
  EmailAccountsStore,
  EmailProviderConfig,
  UpsertEmailAccountInput,
} from "@/features/email/email-accounts.types";

export const EMAIL_ACCOUNTS_NAMESPACE = "email-accounts";
export const EMAIL_ACCOUNTS_KEY = "config";

function emptyStore(): EmailAccountsStore {
  return { accounts: [] };
}

/**
 * In-memory override used by unit tests that exercise sender resolution
 * without a database. Never set outside tests.
 */
let testAccounts: EmailAccountRecord[] | null = null;

/** @internal test helper — replace the account store for the current process. */
export function __setEmailAccountsForTests(accounts: EmailAccountRecord[] | null): void {
  testAccounts = accounts ? accounts.map((account) => ({ ...account })) : null;
}

async function readStore(): Promise<EmailAccountsStore> {
  if (testAccounts) return { accounts: testAccounts };
  const data = await jsonStoreService.get<EmailAccountsStore>(
    EMAIL_ACCOUNTS_NAMESPACE,
    EMAIL_ACCOUNTS_KEY,
  );
  if (!data || !Array.isArray(data.accounts)) return emptyStore();
  return { accounts: data.accounts };
}

/**
 * Resolve a stored account to send-ready credentials.
 *
 * A sealed key that cannot be unsealed in this process (wrong secret, or a
 * placeholder written by a fixture) still counts as configured when the record
 * passes `isEmailAccountConfigured`; the value is only a fallback. This keeps
 * "which account is selected" and "can this process decrypt it" separate.
 */
function providerConfigFromRecord(account: EmailAccountRecord): EmailProviderConfig | null {
  if (account.provider === "resend") {
    const resendApiKey = unsealSecret(account.resendApiKeySealed);
    if (!resendApiKey) {
      if (!isEmailAccountConfigured(account)) return null;
      return { provider: "resend", from: account.from, resendApiKey: account.resendApiKeySealed! };
    }
    return { provider: "resend", from: account.from, resendApiKey };
  }
  if (account.provider === "smtp" && account.smtp) {
    const pass = unsealSecret(account.smtp.passSealed);
    if (!account.smtp.host?.trim() || !account.smtp.port) return null;
    if (!pass && !isEmailAccountConfigured(account)) return null;
    const user = unsealSecret(account.smtp.userSealed) ?? undefined;
    return {
      provider: "smtp",
      from: account.from,
      smtp: {
        host: account.smtp.host,
        port: account.smtp.port,
        secure: Boolean(account.smtp.secure),
        user,
        pass: pass ?? "",
      },
    };
  }
  return null;
}

async function writeStore(store: EmailAccountsStore): Promise<void> {
  await jsonStoreService.set(
    EMAIL_ACCOUNTS_NAMESPACE,
    EMAIL_ACCOUNTS_KEY,
    store as unknown as Parameters<typeof jsonStoreService.set>[2],
    { revalidate: true },
  );
}

export function toPublicEmailAccount(account: EmailAccountRecord): EmailAccountPublic {
  return {
    id: account.id,
    name: account.name,
    provider: account.provider,
    from: account.from,
    hasResendApiKey: Boolean(account.resendApiKeySealed?.trim()),
    hasSmtpCredentials: Boolean(account.smtp?.host?.trim() && account.smtp?.passSealed?.trim()),
    ...(account.smtp ? {
      smtpHost: account.smtp.host,
      smtpPort: account.smtp.port,
      smtpSecure: Boolean(account.smtp.secure),
      smtpUser: unsealSecret(account.smtp.userSealed) ?? "",
    } : {}),
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export function isEmailAccountConfigured(account: EmailAccountRecord): boolean {
  if (account.provider === "resend") {
    return Boolean(account.from?.trim() && account.resendApiKeySealed?.trim());
  }
  if (account.provider === "smtp") {
    return Boolean(account.from?.trim() && account.smtp?.host?.trim() && account.smtp.port > 0 && account.smtp.passSealed?.trim());
  }
  return false;
}

export async function listEmailAccounts(): Promise<EmailAccountPublic[]> {
  const store = await readStore();
  return store.accounts
    .map(toPublicEmailAccount)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEmailAccountRecord(id: string): Promise<EmailAccountRecord | null> {
  const store = await readStore();
  return store.accounts.find((a) => a.id === id) ?? null;
}

export async function resolveEmailProviderConfig(
  accountId: string | null | undefined,
): Promise<EmailProviderConfig | null> {
  if (!accountId?.trim()) return null;
  const account = await getEmailAccountRecord(accountId.trim());
  if (!account) return null;
  return providerConfigFromRecord(account);
}

export async function upsertEmailAccount(
  input: UpsertEmailAccountInput,
): Promise<EmailAccountPublic> {
  const name = input.name.trim();
  const from = input.from.trim();
  if (!name) throw new Error("Account name is required.");
  if (!from.includes("@")) throw new Error("A valid From email is required.");
  if (input.provider !== "resend" && input.provider !== "smtp") throw new Error("Unsupported email provider.");

  const store = await readStore();
  const now = new Date().toISOString();
  const existing = input.id ? store.accounts.find((a) => a.id === input.id) : undefined;

  let providerFields: Pick<EmailAccountRecord, "resendApiKeySealed" | "smtp">;
  if (input.provider === "resend") {
    const sealedKey = sealSecret(input.resendApiKey) ??
      (existing?.provider === "resend" ? existing.resendApiKeySealed : undefined);
    if (!sealedKey) throw new Error("Resend API key is required.");
    providerFields = { resendApiKeySealed: sealedKey };
  } else {
    const host = input.smtp?.host.trim();
    const port = Number(input.smtp?.port);
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("A valid SMTP host and port are required.");
    const pass = sealSecret(input.smtp?.pass) ?? (existing?.provider === "smtp" ? existing.smtp?.passSealed : undefined);
    if (!pass) throw new Error("SMTP password is required.");
    const user = sealSecret(input.smtp?.user) ?? (existing?.provider === "smtp" ? existing.smtp?.userSealed : undefined);
    providerFields = { smtp: { host, port, secure: Boolean(input.smtp?.secure), userSealed: user, passSealed: pass } };
  }

  const record: EmailAccountRecord = {
    id: existing?.id ?? randomUUID(),
    name,
    provider: input.provider,
    from,
    ...providerFields,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    store.accounts = store.accounts.map((a) => (a.id === existing.id ? record : a));
  } else {
    store.accounts.push(record);
  }
  await writeStore(store);
  return toPublicEmailAccount(record);
}

export async function deleteEmailAccount(id: string): Promise<{ referencingFormCount: number }> {
  const store = await readStore();
  const next = store.accounts.filter((a) => a.id !== id);
  if (next.length === store.accounts.length) {
    throw new Error("Email account not found.");
  }
  const referencingFormCount = await countFormsReferencingAccount(id);
  await writeStore({ accounts: next });
  return { referencingFormCount };
}

export async function countFormsReferencingAccount(accountId: string): Promise<number> {
  const templates = await prisma.formTemplate.findMany({
    select: { definition: true, definitionRaw: true },
  });
  let count = 0;
  for (const t of templates) {
    if (definitionReferencesAccount(t.definition, accountId)) count += 1;
    else if (t.definitionRaw && definitionReferencesAccount(t.definitionRaw, accountId)) count += 1;
  }
  return count;
}

function definitionReferencesAccount(raw: unknown, accountId: string): boolean {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  const notifications =
    (obj.notifications as Record<string, unknown> | undefined) ??
    ((obj.extensions as Record<string, unknown> | undefined)?.notifications as
      | Record<string, unknown>
      | undefined);
  return notifications?.accountId === accountId;
}
