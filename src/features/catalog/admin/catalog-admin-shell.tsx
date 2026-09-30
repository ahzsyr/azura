"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
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
  ribbonFooter?: ReactNode;
  children: (activeTab: T) => ReactNode;
};

export function CatalogAdminShell<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  hashSync = true,
  className,
  ribbonFooter,
  children,
}: CatalogAdminShellProps<T>) {
  const hashBootstrapped = useRef(false);

  const handleTabChange = useCallback(
    (tabId: string) => {
      onTabChange(tabId as T);
      if (hashSync) writeHashTab(tabId);
    },
    [hashSync, onTabChange],
  );

  useEffect(() => {
    if (!hashSync || hashBootstrapped.current) return;
    hashBootstrapped.current = true;
    const allowed = tabs as unknown as readonly { id: T }[];
    const fallback = (allowed[0]?.id ?? activeTab) as T;
    onTabChange(readHashTab(allowed, fallback));
  }, [activeTab, hashSync, onTabChange, tabs]);

  useEffect(() => {
    if (!hashSync) return;
    const allowed = tabs as unknown as readonly { id: T }[];
    const fallback = (allowed[0]?.id ?? activeTab) as T;
    const sync = () => {
      const next = readHashTab(allowed, fallback);
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
        ribbonFooter={ribbonFooter}
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
