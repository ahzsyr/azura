import "server-only";

import { jsonStoreService } from "@/features/storage/json-store.service";
import {
  accountSettingsSchema,
  adminAuthSettingsSchema,
  defaultAccountSettings,
  defaultAdminAuthSettings,
  defaultEmailDeliverySettings,
  defaultEmailVerificationSettings,
  emailDeliverySettingsSchema,
  emailVerificationSettingsSchema,
  passwordResetSettingsSchema,
  type AccountSettings,
  type AdminAuthSettings,
  type EmailDeliverySettings,
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

/**
 * Email delivery defaults to the legacy "Admin account → Email delivery"
 * selection once, so an upgrade keeps sending from the mailbox an
 * administrator already picked. The legacy field is never cleared here — this
 * runs on read — so the setting survives until an admin saves Email delivery.
 */
function normalizeEmailDelivery(raw: unknown, legacyAdminAuth: AdminAuthSettings): EmailDeliverySettings {
  const base = defaultEmailDeliverySettings();
  if (!isStoredSettings(raw)) {
    return { ...base, emailAccountId: legacyAdminAuth.otpEmailAccountId };
  }
  const parsed = emailDeliverySettingsSchema.safeParse({ ...base, ...raw });
  if (!parsed.success) {
    return { ...base, emailAccountId: legacyAdminAuth.otpEmailAccountId };
  }
  const emailAccountId = parsed.data.emailAccountId || legacyAdminAuth.otpEmailAccountId;
  return {
    emailAccountId,
    fromName: parsed.data.fromName || undefined,
  };
}

function normalizeSettings(raw: unknown): AccountSettings {
  if (!isStoredSettings(raw)) return defaultAccountSettings();
  const adminAuth = normalizeAdminAuth(raw.adminAuth);
  return {
    passwordReset: normalizePasswordReset(raw.passwordReset),
    emailVerification: normalizeEmailVerification(raw.emailVerification),
    adminAuth,
    emailDelivery: normalizeEmailDelivery(raw.emailDelivery, adminAuth),
  };
}

async function writeSettings(next: AccountSettings): Promise<AccountSettings> {
  accountSettingsSchema.parse(next);
  await jsonStoreService.set(NAMESPACE, SETTINGS_KEY, next, { revalidate: true });
  return next;
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
    return writeSettings({
      ...current,
      passwordReset: normalizePasswordReset({ ...current.passwordReset, ...patch }),
    });
  },

  async saveEmailVerification(
    patch: Partial<EmailVerificationSettings>,
  ): Promise<AccountSettings> {
    const current = await this.get();
    return writeSettings({
      ...current,
      emailVerification: normalizeEmailVerification({
        ...current.emailVerification,
        ...patch,
      }),
    });
  },

  /**
   * Site-wide authentication sender (Settings → Email Accounts → Email
   * delivery). Not restricted to the admin who saves it: any administrator may
   * point every account's codes at the mailbox of their choice.
   */
  async saveEmailDelivery(patch: Partial<EmailDeliverySettings>): Promise<AccountSettings> {
    const current = await this.get();
    const merged = { ...current.emailDelivery, ...patch };
    return writeSettings({
      ...current,
      emailDelivery: {
        emailAccountId: merged.emailAccountId?.trim() || undefined,
        fromName: merged.fromName?.trim() || undefined,
      },
    });
  },

  /**
   * @deprecated Email delivery is configured under Email Accounts. Kept for
   * callers/tests written against the old location; writes the same canonical
   * field.
   */
  async saveAdminAuth(patch: Partial<AdminAuthSettings>): Promise<AccountSettings> {
    const current = await this.get();
    const nextAdminAuth = normalizeAdminAuth({ ...current.adminAuth, ...patch });
    return writeSettings({
      ...current,
      adminAuth: nextAdminAuth,
      emailDelivery: nextAdminAuth.otpEmailAccountId
        ? { ...current.emailDelivery, emailAccountId: nextAdminAuth.otpEmailAccountId }
        : current.emailDelivery,
    });
  },
};
