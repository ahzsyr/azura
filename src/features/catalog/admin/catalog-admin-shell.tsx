"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { AdminSettingsLayout, type SettingsRibbonTab } from "@/components/admin/layout/admin-settings-layout";
import { Card, CardContent } from "@/components/ui/card";
import { readHashTab, writeHashTab } from "./catalog-admin-tabs";
import { cn } from "@/lib/utils";

type CatalogAdminShellProps<T extends string> = {
  tabs: readonly SettingsRibbonTab[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  hashSync?: boolean;
  className?: string;
  children: (activeTab: T) => ReactNode;
};

export function CatalogAdminShell<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  hashSync = true,
  className,
  children,
}: CatalogAdminShellProps<T>) {
  const handleTabChange = useCallback(
    (tabId: string) => {
      onTabChange(tabId as T);
      if (hashSync) writeHashTab(tabId);
    },
    [hashSync, onTabChange],
  );

  useEffect(() => {
    if (!hashSync) return;
    const sync = () => {
      const next = readHashTab(tabs as unknown as readonly { id: T }[], activeTab);
      if (next !== activeTab) onTabChange(next);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [activeTab, hashSync, onTabChange, tabs]);

  return (
    <div className={cn("space-y-6", className)}>
      <AdminSettingsLayout
        tabs={[...tabs]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {(tabId) => (
          <Card>
            <CardContent className="pt-6">{children(tabId as T)}</CardContent>
          </Card>
        )}
      </AdminSettingsLayout>
    </div>
  );
}
