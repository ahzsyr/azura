"use client";

import type { ReactNode } from "react";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";

export type ThemeSectionId =
  | "look-and-feel"
  | "colors"
  | "typography"
  | "branding"
  | "motion"
  | "effects"
  | "advanced";

export const THEME_BUILDER_TABS = [
  { id: "look-and-feel", label: "Look & Feel" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "branding", label: "Branding" },
  { id: "motion", label: "Motion" },
  { id: "effects", label: "Effects" },
  { id: "advanced", label: "Advanced" },
] as const;

export const THEME_SECTION_STORAGE_KEY = "theme-active-section";

export function readSavedThemeSection(): ThemeSectionId {
  try {
    const value = localStorage.getItem(THEME_SECTION_STORAGE_KEY);
    if (value && THEME_BUILDER_TABS.some((tab) => tab.id === value)) {
      return value as ThemeSectionId;
    }
  } catch {
    /* ignore */
  }
  return "look-and-feel";
}

type ThemeBuilderShellProps = {
  activeSection: ThemeSectionId;
  onSectionChange: (id: ThemeSectionId) => void;
  children: (sectionId: ThemeSectionId) => ReactNode;
};

export function ThemeBuilderShell({ activeSection, onSectionChange, children }: ThemeBuilderShellProps) {
  return (
    <AdminSettingsLayout
      tabs={[...THEME_BUILDER_TABS]}
      activeTab={activeSection}
      onTabChange={(id) => onSectionChange(id as ThemeSectionId)}
    >
      {(tabId) => children(tabId as ThemeSectionId)}
    </AdminSettingsLayout>
  );
}
