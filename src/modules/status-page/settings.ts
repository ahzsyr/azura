import { z } from "zod";
import { registerModuleSettings } from "@/platform/packages/module-settings-registry";
import { STATUS_PAGE_MODULE_ID } from "@/modules/status-page/manifest";

export const statusPageSettingsSchema = z.object({
  adminNotice: z.string().max(500).default(""),
});

export type StatusPageSettings = z.infer<typeof statusPageSettingsSchema>;

let registered = false;

export function ensureStatusPageSettingsRegistered(): void {
  if (registered) return;
  registerModuleSettings({
    packageId: STATUS_PAGE_MODULE_ID,
    schemaVersion: 1,
    schema: statusPageSettingsSchema,
    defaults: { adminNotice: "" },
    secretKeys: [],
    adminPath: "/admin/status",
  });
  registered = true;
}

ensureStatusPageSettingsRegistered();
