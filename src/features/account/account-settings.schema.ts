import { z } from "zod";

export const passwordResetSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  tokenExpiryHours: z.number().min(0.25).max(168).default(1),
  emailSubject: z.string().min(1).max(200).default("Reset your password"),
  emailHeading: z.string().min(1).max(200).default("Password reset"),
  emailBody: z
    .string()
    .min(1)
    .max(4000)
    .default(
      "Hello {{name}},\n\nWe received a request to reset your password. Use the link below within {{expiryHours}} hour(s):\n\n{{resetLink}}\n\nIf you did not request this, you can ignore this email."
    ),
  replyToEmail: z.string().email().optional().or(z.literal("")),
  notifyReceiverEmail: z.string().email().optional().or(z.literal("")),
  fromName: z.string().max(120).optional().or(z.literal("")),
});

export type PasswordResetSettings = z.infer<typeof passwordResetSettingsSchema>;

export const defaultPasswordResetSettings = (): PasswordResetSettings =>
  passwordResetSettingsSchema.parse({});

export const accountSettingsSchema = z.object({
  passwordReset: passwordResetSettingsSchema,
});

export type AccountSettings = z.infer<typeof accountSettingsSchema>;

export const defaultAccountSettings = (): AccountSettings => ({
  passwordReset: defaultPasswordResetSettings(),
});
