"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { AdminSettingsRibbon, AdminSettingsSection, type SettingsRibbonTab } from "./admin-settings-ribbon";
import { cn } from "@/lib/utils";

type AdminSettingsLayoutProps = {
  tabs: SettingsRibbonTab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: (activeTab: string) => ReactNode;
  className?: string;
};

export function AdminSettingsLayout({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  children,
  className,
}: AdminSettingsLayoutProps) {
  const [internalTab, setInternalTab] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeTab = controlledTab ?? internalTab;
  const handleTabChange = onTabChange ?? setInternalTab;

  return (
    <div className={cn("space-y-6", className)}>
      <AdminSettingsRibbon tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="pt-2">
        <AnimatePresence mode="wait">
          <AdminSettingsSection key={activeTab} id={activeTab}>
            {children(activeTab)}
          </AdminSettingsSection>
        </AnimatePresence>
      </div>
    </div>
  );
}

export type { SettingsRibbonTab };
