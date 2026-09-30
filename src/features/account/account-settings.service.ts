import "server-only";

import { jsonStoreService } from "@/features/storage/json-store.service";
import {
  accountSettingsSchema,
  adminAuthSettingsSchema,
  defaultAccountSettings,
  defaultAdminAuthSettings,
  defaultEmailVerificationSettings,
  emailVerificationSettingsSchema,
  passwordResetSettingsSchema,
  type AccountSettings,
  type AdminAuthSettings,
  type EmailVerificationSettings,
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
    emailAccountId: v.emailAccountId || undefined,
  };
}

function normalizeEmailVerification(raw: unknown): EmailVerificationSettings {
  const base = defaultEmailVerificationSettings();
  if (!raw || typeof raw !== "object") return base;
  const parsed = emailVerificationSettingsSchema.safeParse({ ...base, ...raw });
  if (!parsed.success) return base;
  const v = parsed.data;
  return {
    ...v,
    fromName: v.fromName || undefined,
    emailAccountId: v.emailAccountId || undefined,
  };
}

function normalizeAdminAuth(raw: unknown): AdminAuthSettings {
  const base = defaultAdminAuthSettings();
  if (!raw || typeof raw !== "object") return base;
  const parsed = adminAuthSettingsSchema.safeParse({ ...base, ...raw });
  if (!parsed.success) return base;
  return {
    otpEmailAccountId: parsed.data.otpEmailAccountId || undefined,
    passwordResetEmailAccountId: parsed.data.passwordResetEmailAccountId || undefined,
  };
}

function normalizeSettings(raw: unknown): AccountSettings {
  if (!raw || typeof raw !== "object") return defaultAccountSettings();
  const o = raw as Record<string, unknown>;
  return {
    passwordReset: normalizePasswordReset(o.passwordReset),
    emailVerification: normalizeEmailVerification(o.emailVerification),
    adminAuth: normalizeAdminAuth(o.adminAuth),
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
    const next: AccountSettings = {
      passwordReset: normalizePasswordReset({ ...current.passwordReset, ...patch }),
      emailVerification: current.emailVerification,
      adminAuth: current.adminAuth,
    };
    accountSettingsSchema.parse(next);
    await jsonStoreService.set(NAMESPACE, SETTINGS_KEY, next, { revalidate: true });
    return next;
  },

  async saveEmailVerification(
    patch: Partial<EmailVerificationSettings>,
  ): Promise<AccountSettings> {
    const current = await this.get();
    const next: AccountSettings = {
      passwordReset: current.passwordReset,
      emailVerification: normalizeEmailVerification({
        ...current.emailVerification,
        ...patch,
      }),
      adminAuth: current.adminAuth,
    };
    accountSettingsSchema.parse(next);
    await jsonStoreService.set(NAMESPACE, SETTINGS_KEY, next, { revalidate: true });
    return next;
  },

  async saveAdminAuth(patch: Partial<AdminAuthSettings>): Promise<AccountSettings> {
    const current = await this.get();
    const next: AccountSettings = {
      passwordReset: current.passwordReset,
      emailVerification: current.emailVerification,
      adminAuth: normalizeAdminAuth({ ...current.adminAuth, ...patch }),
    };
    accountSettingsSchema.parse(next);
    await jsonStoreService.set(NAMESPACE, SETTINGS_KEY, next, { revalidate: true });
    return next;
  },
};
