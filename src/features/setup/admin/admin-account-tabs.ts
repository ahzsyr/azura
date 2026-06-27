import type { SettingsRibbonTab } from "@/components/admin/layout/admin-settings-layout";

export const ADMIN_ACCOUNT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "verify", label: "Verify changes" },
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "access", label: "Access" },
] as const satisfies readonly SettingsRibbonTab[];

export type AdminAccountTabId = (typeof ADMIN_ACCOUNT_TABS)[number]["id"];

export function isAdminAccountTab(id: string | null): id is AdminAccountTabId {
  return ADMIN_ACCOUNT_TABS.some((t) => t.id === id);
}
