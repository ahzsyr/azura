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
  /** Unique Framer Motion layoutId when multiple ribbons coexist on one page. */
  layoutId?: string;
  /** Optional content rendered below the tab ribbon (e.g. hierarchy navigation). */
  ribbonFooter?: ReactNode;
};

export function AdminSettingsLayout({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  children,
  className,
  layoutId,
  ribbonFooter,
}: AdminSettingsLayoutProps) {
  const [internalTab, setInternalTab] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeTab = controlledTab ?? internalTab;
  const handleTabChange = onTabChange ?? setInternalTab;

  return (
    <div className={cn("space-y-6", className)}>
      {ribbonFooter ? (
        <div className="admin-liquid-glass sticky top-12 z-20 border-b shadow-sm">
          <AdminSettingsRibbon
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            layoutId={layoutId}
            className="sticky top-auto z-auto border-b-0 shadow-none"
          />
          <div className="border-t border-border/60 px-2 py-2">{ribbonFooter}</div>
        </div>
      ) : (
        <AdminSettingsRibbon
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          layoutId={layoutId}
        />
      )}
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
