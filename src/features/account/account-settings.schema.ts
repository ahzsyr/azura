import { z } from "zod";

export const passwordResetSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  /** Kept for stored settings compatibility; reset links always use a fixed 5-minute TTL. */
  tokenExpiryHours: z.number().min(0.08).max(168).default(5 / 60),
  emailSubject: z.string().min(1).max(200).default("Reset your password"),
  emailHeading: z.string().min(1).max(200).default("Password reset"),
  emailBody: z
    .string()
    .min(1)
    .max(4000)
    .default(
      "Hello {{name}},\n\nWe received a request to reset your password. Use the link below within {{expiryMinutes}} minutes (one-time use only):\n\n{{resetLink}}\n\nIf you did not request this, you can ignore this email."
    ),
  replyToEmail: z.string().email().optional().or(z.literal("")),
  notifyReceiverEmail: z.string().email().optional().or(z.literal("")),
  fromName: z.string().max(120).optional().or(z.literal("")),
  emailAccountId: z.string().max(64).optional().or(z.literal("")),
});

export type PasswordResetSettings = z.infer<typeof passwordResetSettingsSchema>;

export const defaultPasswordResetSettings = (): PasswordResetSettings =>
  passwordResetSettingsSchema.parse({});

export const emailVerificationSettingsSchema = z.object({
  emailSubject: z.string().min(1).max(200).default("Verify your email"),
  emailHeading: z.string().min(1).max(200).default("Confirm your email"),
  emailBody: z
    .string()
    .min(1)
    .max(4000)
    .default(
      "Hello {{name}},\n\nYour verification code expires in 5 minutes. Enter it on the verification page to activate your account."
    ),
  fromName: z.string().max(120).optional().or(z.literal("")),
  emailAccountId: z.string().max(64).optional().or(z.literal("")),
});

export type EmailVerificationSettings = z.infer<typeof emailVerificationSettingsSchema>;

export const defaultEmailVerificationSettings = (): EmailVerificationSettings =>
  emailVerificationSettingsSchema.parse({});

/** System-level admin auth email delivery (Master Admin configures). */
export const adminAuthSettingsSchema = z.object({
  otpEmailAccountId: z.string().max(64).optional().or(z.literal("")),
  passwordResetEmailAccountId: z.string().max(64).optional().or(z.literal("")),
});

export type AdminAuthSettings = z.infer<typeof adminAuthSettingsSchema>;

export const defaultAdminAuthSettings = (): AdminAuthSettings =>
  adminAuthSettingsSchema.parse({});

export const accountSettingsSchema = z.object({
  passwordReset: passwordResetSettingsSchema,
  emailVerification: emailVerificationSettingsSchema.default(
    defaultEmailVerificationSettings(),
  ),
  adminAuth: adminAuthSettingsSchema.default(defaultAdminAuthSettings()),
});

export type AccountSettings = z.infer<typeof accountSettingsSchema>;

export const defaultAccountSettings = (): AccountSettings => ({
  passwordReset: defaultPasswordResetSettings(),
  emailVerification: defaultEmailVerificationSettings(),
  adminAuth: defaultAdminAuthSettings(),
});
