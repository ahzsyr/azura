"use client";

import { useRegisterAdminPageConfig } from "@/components/admin/layout/admin-page-config-provider";
import { ADMIN_PAGE_CONFIGS, type AdminPageConfigKey } from "@/config/admin-page-configs";

/** Registers the runtime adminPageConfig for the current route (dev indicator + contract). */
export function AdminPageConfigRegistrar({
  configKey,
}: {
  configKey: AdminPageConfigKey;
}) {
  useRegisterAdminPageConfig(ADMIN_PAGE_CONFIGS[configKey]);
  return null;
}
