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

export type { AccountSettings } from "@/features/account/account-settings.schema";

/**
 * Treat "nothing stored" as defaults, never as a configured value.
 *
 * `jsonStoreService.get()` resolves to `null` when the row is absent. Passing
 * that down as `{}` made `schema.parse({})` look like a complete settings
 * object: every field is optional or defaulted, so the result was a
 * `{ emailAccountId: undefined }` shape that reads as "configured". Callers
 * then resolved no provider and silently dropped delivery.
 */
function isStoredSettings(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

function normalizePasswordReset(raw: unknown): PasswordResetSettings {
  const base = defaultAccountSettings().passwordReset;
  if (!isStoredSettings(raw)) return base;
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
  if (!isStoredSettings(raw)) return base;
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
  if (!isStoredSettings(raw)) return base;
  const parsed = adminAuthSettingsSchema.safeParse({ ...base, ...raw });
  if (!parsed.success) return base;
  return {
    otpEmailAccountId: parsed.data.otpEmailAccountId || undefined,
    passwordResetEmailAccountId: parsed.data.passwordResetEmailAccountId || undefined,
  };
}

function normalizeSettings(raw: unknown): AccountSettings {
  if (!isStoredSettings(raw)) return defaultAccountSettings();
  return {
    passwordReset: normalizePasswordReset(raw.passwordReset),
    emailVerification: normalizeEmailVerification(raw.emailVerification),
    adminAuth: normalizeAdminAuth(raw.adminAuth),
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
