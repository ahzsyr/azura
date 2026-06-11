"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Input } from "@/components/ui/input";

export type ThemeStudioSectionId =
  | "overview"
  | "presets"
  | "colors"
  | "typography"
  | "layout"
  | "motion"
  | "effects"
  | "cards-borders"
  | "backgrounds"
  | "accessibility"
  | "custom-css"
  | "advanced"
  | "preview";

export const THEME_STUDIO_TABS = [
  { id: "overview", label: "Overview" },
  { id: "presets", label: "Presets" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "layout", label: "Layout" },
  { id: "motion", label: "Motion" },
  { id: "effects", label: "Effects" },
  { id: "cards-borders", label: "Cards & Borders" },
  { id: "backgrounds", label: "Backgrounds" },
  { id: "accessibility", label: "Accessibility" },
  { id: "custom-css", label: "Custom CSS" },
  { id: "advanced", label: "Advanced" },
  { id: "preview", label: "Preview" },
] as const;

export const THEME_SECTION_STORAGE_KEY = "theme-active-section";

export function isThemeStudioSectionId(value: string): value is ThemeStudioSectionId {
  return THEME_STUDIO_TABS.some((tab) => tab.id === value);
}

export function readSavedThemeSection(): ThemeStudioSectionId {
  try {
    const value = localStorage.getItem(THEME_SECTION_STORAGE_KEY);
    if (value && isThemeStudioSectionId(value)) return value;
    if (value === "look-and-feel") return "overview";
    if (value === "branding") return "advanced";
  } catch {
    /* ignore */
  }
  return "overview";
}

function ThemeSearchContainer({ query, children }: { query: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const controls = root.querySelectorAll<HTMLElement>("[data-theme-search]");
    controls.forEach((el) => {
      if (!query) {
        el.style.display = "";
        return;
      }
      const haystack = el.getAttribute("data-theme-search") ?? "";
      el.style.display = haystack.includes(query) ? "" : "none";
    });
  }, [query]);

  return <div ref={ref}>{children}</div>;
}

type ThemeStudioShellProps = {
  activeSection: ThemeStudioSectionId;
  onSectionChange: (id: ThemeStudioSectionId) => void;
  children: (sectionId: ThemeStudioSectionId, searchQuery: string) => ReactNode;
};

export function ThemeStudioShell({
  activeSection,
  onSectionChange,
  children,
}: ThemeStudioShellProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search theme settings…"
          className="pl-9"
          aria-label="Search theme settings"
        />
      </div>

      <AdminSettingsLayout
        tabs={[...THEME_STUDIO_TABS]}
        activeTab={activeSection}
        onTabChange={(id) => onSectionChange(id as ThemeStudioSectionId)}
      >
        {(tabId) => (
          <ThemeSearchContainer query={normalizedQuery}>
            {children(tabId as ThemeStudioSectionId, normalizedQuery)}
          </ThemeSearchContainer>
        )}
      </AdminSettingsLayout>
    </div>
  );
}
