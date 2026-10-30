import { z } from "zod";
import { registerModuleSettings } from "@/platform/packages/module-settings-registry";
import { DOCUMENTATION_MODULE_ID } from "@/modules/documentation/manifest";

export const documentationSettingsSchema = z.object({
  /** Operator note shown on the Documentation admin list (non-secret). */
  adminNotice: z.string().max(500).default(""),
  /** When true, admin list includes unpublished portals by default. */
  preferUnpublishedInAdmin: z.boolean().default(false),
});

export type DocumentationSettings = z.infer<typeof documentationSettingsSchema>;

export const DOCUMENTATION_SETTINGS_DEFAULTS: DocumentationSettings = {
  adminNotice: "",
  preferUnpublishedInAdmin: false,
};

let registered = false;

/** Idempotent registration for Documentation Module settings. */
export function ensureDocumentationSettingsRegistered(): void {
  if (registered) return;
  registerModuleSettings({
    packageId: DOCUMENTATION_MODULE_ID,
    schemaVersion: 1,
    schema: documentationSettingsSchema,
    defaults: DOCUMENTATION_SETTINGS_DEFAULTS,
    secretKeys: [],
    adminPath: "/admin/documentation",
  });
  registered = true;
}

ensureDocumentationSettingsRegistered();
