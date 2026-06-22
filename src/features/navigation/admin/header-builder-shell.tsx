"use client";

import type { ReactNode } from "react";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";

export type DashboardNavId =
  | "mobile"
  | "headerStyle"
  | "headerDesktop"
  | "menuManager"
  | "menuEditor"
  | "actions";

export const HEADER_BUILDER_TABS = [
  { id: "mobile", label: "Mobile" },
  { id: "headerStyle", label: "Style" },
  { id: "headerDesktop", label: "Desktop" },
  { id: "menuManager", label: "Menus" },
  { id: "menuEditor", label: "Builder" },
  { id: "actions", label: "Actions" },
];

export const SECTION_STORAGE_KEY = "hb-active-section";

export function readSavedHeaderSection(): DashboardNavId {
  try {
    const v = localStorage.getItem(SECTION_STORAGE_KEY);
    if (v === "branding") return "menuEditor";
    if (v && HEADER_BUILDER_TABS.some((t) => t.id === v)) return v as DashboardNavId;
  } catch {
    /* ignore */
  }
  return "menuEditor";
}

type HeaderBuilderShellProps = {
  activeSection: DashboardNavId;
  onSectionChange: (id: DashboardNavId) => void;
  children: (sectionId: DashboardNavId) => ReactNode;
};

export function HeaderBuilderShell({
  activeSection,
  onSectionChange,
  children,
}: HeaderBuilderShellProps) {
  return (
    <AdminSettingsLayout
      tabs={HEADER_BUILDER_TABS}
      activeTab={activeSection}
      onTabChange={(id) => onSectionChange(id as DashboardNavId)}
    >
      {(tabId) => children(tabId as DashboardNavId)}
    </AdminSettingsLayout>
  );
}
