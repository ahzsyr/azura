import "server-only";

import { jsonStoreService } from "@/features/storage/json-store.service";
import {
  accountSettingsSchema,
  defaultAccountSettings,
  passwordResetSettingsSchema,
  type AccountSettings,
  type PasswordResetSettings,
} from "@/features/account/account-settings.schema";

const NAMESPACE = "account";
const SETTINGS_KEY = "settings";

function normalizePasswordReset(raw: unknown): PasswordResetSettings {
  const base = defaultAccountSettings().passwordReset;
  if (!raw || typeof raw !== "object") return base;
  const parsed = passwordResetSettingsSchema.safeParse({ ...base, ...raw });
  if (!parsed.success) return base;
  const v = parsed.data;
  return {
    ...v,
    replyToEmail: v.replyToEmail || undefined,
    notifyReceiverEmail: v.notifyReceiverEmail || undefined,
    fromName: v.fromName || undefined,
  };
}

function normalizeSettings(raw: unknown): AccountSettings {
  if (!raw || typeof raw !== "object") return defaultAccountSettings();
  const o = raw as Record<string, unknown>;
  return {
    passwordReset: normalizePasswordReset(o.passwordReset),
  };
}

export const accountSettingsService = {
  async get(): Promise<AccountSettings> {
    try {
      const stored = await jsonStoreService.get<unknown>(NAMESPACE, SETTINGS_KEY);
      return normalizeSettings(stored);
    } catch (error) {
      console.error("[accountSettingsService] get failed:", error);
      return defaultAccountSettings();
    }
  },

  async savePasswordReset(patch: Partial<PasswordResetSettings>): Promise<AccountSettings> {
    const current = await this.get();
    const merged = normalizePasswordReset({ ...current.passwordReset, ...patch });
    const next: AccountSettings = { passwordReset: merged };
    accountSettingsSchema.parse(next);
    await jsonStoreService.set(NAMESPACE, SETTINGS_KEY, next, { revalidate: true });
    return next;
  },
};
