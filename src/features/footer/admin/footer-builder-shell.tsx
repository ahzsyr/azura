"use client";

import type { ReactNode } from "react";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";

export type FooterNavId =
  | "sections"
  | "layout"
  | "design"
  | "responsive"
  | "copyright"
  | "templates";

export const FOOTER_BUILDER_TABS = [
  { id: "sections", label: "Sections" },
  { id: "layout", label: "Layout" },
  { id: "design", label: "Design" },
  { id: "responsive", label: "Responsive" },
  { id: "copyright", label: "Copyright" },
  { id: "templates", label: "Footer templates" },
];

export const FOOTER_SECTION_STORAGE_KEY = "fb-active-section";

export function readSavedFooterSection(): FooterNavId {
  try {
    const v = localStorage.getItem(FOOTER_SECTION_STORAGE_KEY);
    if (v && FOOTER_BUILDER_TABS.some((t) => t.id === v)) return v as FooterNavId;
    // migrate legacy tab ids
    if (v === "columns") return "sections";
  } catch {
    /* ignore */
  }
  return "sections";
}

type Props = {
  activeSection: FooterNavId;
  onSectionChange: (id: FooterNavId) => void;
  children: (sectionId: FooterNavId) => ReactNode;
};

export function FooterBuilderShell({ activeSection, onSectionChange, children }: Props) {
  return (
    <AdminSettingsLayout
      tabs={FOOTER_BUILDER_TABS}
      activeTab={activeSection}
      onTabChange={(id) => onSectionChange(id as FooterNavId)}
    >
      {(tabId) => children(tabId as FooterNavId)}
    </AdminSettingsLayout>
  );
}
