/**
 * Marketing settings pilot (Phase 3): Core registry + one secret key in ModuleSetting.
 * Existing MarketingProviderAppConfig remains the dual-store for provider credentials;
 * this proves secret redaction / reset without a big-bang table rewrite.
 */

import { z } from "zod";
import { registerModuleSettings } from "@/platform/packages/module-settings-registry";
import { MARKETING_MODULE_ID } from "@/modules/marketing/manifest";

export const marketingSettingsSchema = z.object({
  /** Non-secret operator note for Marketing settings. */
  adminNotice: z.string().max(500).default(""),
  /**
   * Pilot secret — stored only in ModuleSetting.
   * Provider app secrets stay in MarketingProviderAppConfig (dual-store).
   */
  webhookProbeSecret: z.string().max(512).default(""),
});

export type MarketingSettings = z.infer<typeof marketingSettingsSchema>;

export const MARKETING_SETTINGS_SECRET_KEYS = ["webhookProbeSecret"] as const;

let registered = false;

export function ensureMarketingSettingsRegistered(): void {
  if (registered) return;
  registerModuleSettings({
    packageId: MARKETING_MODULE_ID,
    schemaVersion: 1,
    schema: marketingSettingsSchema,
    defaults: { adminNotice: "", webhookProbeSecret: "" },
    secretKeys: MARKETING_SETTINGS_SECRET_KEYS,
    adminPath: "/admin/marketing/settings",
  });
  registered = true;
}

ensureMarketingSettingsRegistered();
