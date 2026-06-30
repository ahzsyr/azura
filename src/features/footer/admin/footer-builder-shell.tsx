"use client";

import type { ReactNode } from "react";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";

export type FooterNavId = "columns" | "layout" | "copyright";

export const FOOTER_BUILDER_TABS = [
  { id: "columns", label: "Columns" },
  { id: "layout", label: "Layout & design" },
  { id: "copyright", label: "Copyright" },
];

export const FOOTER_SECTION_STORAGE_KEY = "fb-active-section";

export function readSavedFooterSection(): FooterNavId {
  try {
    const v = localStorage.getItem(FOOTER_SECTION_STORAGE_KEY);
    if (v && FOOTER_BUILDER_TABS.some((t) => t.id === v)) return v as FooterNavId;
  } catch {
    /* ignore */
  }
  return "columns";
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
