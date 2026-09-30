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

async function readStore(): Promise<EmailAccountsStore> {
  const data = await jsonStoreService.get<EmailAccountsStore>(
    EMAIL_ACCOUNTS_NAMESPACE,
    EMAIL_ACCOUNTS_KEY,
  );
  if (!data || !Array.isArray(data.accounts)) return emptyStore();
  return { accounts: data.accounts };
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
    smtpHost: account.smtp?.host,
    smtpPort: account.smtp?.port,
    hasSmtpUser: Boolean(account.smtp?.userSealed?.trim()),
    hasSmtpPass: Boolean(account.smtp?.passSealed?.trim()),
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export function isEmailAccountConfigured(account: EmailAccountRecord): boolean {
  if (account.provider === "resend") {
    return Boolean(account.from?.trim() && account.resendApiKeySealed?.trim());
  }
  return Boolean(account.from?.trim() && account.smtp?.host?.trim());
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

  if (account.provider === "resend") {
    const resendApiKey = unsealSecret(account.resendApiKeySealed);
    if (!resendApiKey) return null;
    return {
      provider: "resend",
      from: account.from,
      resendApiKey,
    };
  }

  if (!account.smtp?.host) return null;
  return {
    provider: "smtp",
    from: account.from,
    smtp: {
      host: account.smtp.host,
      port: account.smtp.port || 587,
      user: unsealSecret(account.smtp.userSealed),
      pass: unsealSecret(account.smtp.passSealed),
    },
  };
}

export async function upsertEmailAccount(
  input: UpsertEmailAccountInput,
): Promise<EmailAccountPublic> {
  const name = input.name.trim();
  const from = input.from.trim();
  if (!name) throw new Error("Account name is required.");
  if (!from.includes("@")) throw new Error("A valid From email is required.");

  const store = await readStore();
  const now = new Date().toISOString();
  const existing = input.id ? store.accounts.find((a) => a.id === input.id) : undefined;

  if (input.provider === "resend") {
    const sealedKey =
      sealSecret(input.resendApiKey) ?? existing?.resendApiKeySealed;
    if (!sealedKey) throw new Error("Resend API key is required.");

    const record: EmailAccountRecord = {
      id: existing?.id ?? randomUUID(),
      name,
      provider: "resend",
      from,
      resendApiKeySealed: sealedKey,
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

  const host = (input.smtpHost ?? existing?.smtp?.host ?? "").trim();
  if (!host) throw new Error("SMTP host is required.");
  const port = Number(input.smtpPort ?? existing?.smtp?.port ?? 587) || 587;
  const userSealed =
    sealSecret(input.smtpUser) ?? existing?.smtp?.userSealed;
  const passSealed =
    sealSecret(input.smtpPass) ?? existing?.smtp?.passSealed;

  const record: EmailAccountRecord = {
    id: existing?.id ?? randomUUID(),
    name,
    provider: "smtp",
    from,
    smtp: {
      host,
      port,
      userSealed,
      passSealed,
    },
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
