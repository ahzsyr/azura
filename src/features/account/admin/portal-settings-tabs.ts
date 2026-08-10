import type { SettingsRibbonTab } from "@/components/admin/layout/admin-settings-layout";

export const PORTAL_SETTINGS_TABS = [
  { id: "registration", label: "Registration" },
  { id: "password-reset", label: "Password reset" },
] as const satisfies readonly SettingsRibbonTab[];

export type PortalSettingsTabId = (typeof PORTAL_SETTINGS_TABS)[number]["id"];

export function isPortalSettingsTab(id: string | null): id is PortalSettingsTabId {
  return PORTAL_SETTINGS_TABS.some((t) => t.id === id);
}
