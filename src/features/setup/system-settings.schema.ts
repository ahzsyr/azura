import { z } from "zod";

export const SYSTEM_SETTINGS_KEY = "system";
export const SYSTEM_SETTINGS_NAMESPACE = "settings" as const;

export const systemSettingsSchema = z.object({
  setupComplete: z.boolean().default(false),
  completedAt: z.string().optional(),
  registrationEnabled: z.boolean().default(true),
  comingSoonEnabled: z.boolean().default(false),
  /** Auto-generated at setup when AUTH_SECRET env is missing or placeholder. */
  authSecret: z.string().min(16).optional(),
});

export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const defaultSystemSettings = (): SystemSettings => ({
  setupComplete: false,
  registrationEnabled: true,
  comingSoonEnabled: false,
});
