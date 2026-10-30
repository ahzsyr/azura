import { z } from "zod";
import { registerModuleSettings } from "@/platform/packages/module-settings-registry";
import { ADVANCED_SEO_MODULE_ID } from "@/modules/advanced-seo/manifest";

/** Path-only settings registration — Advanced SEO configure surfaces stay under /admin/seo/*. */
export const advancedSeoSettingsSchema = z.object({});

export type AdvancedSeoSettings = z.infer<typeof advancedSeoSettingsSchema>;

let registered = false;

/** Idempotent registration so Modules Manager can deep-link Module settings. */
export function ensureAdvancedSeoSettingsRegistered(): void {
  if (registered) return;
  registerModuleSettings({
    packageId: ADVANCED_SEO_MODULE_ID,
    schemaVersion: 1,
    schema: advancedSeoSettingsSchema,
    defaults: {},
    secretKeys: [],
    adminPath: "/admin/seo/templates",
  });
  registered = true;
}

ensureAdvancedSeoSettingsRegistered();
