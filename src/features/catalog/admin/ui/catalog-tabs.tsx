"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CatalogTabItem = {
  id: string;
  label: string;
};

type CatalogTabsProps = {
  tabs: readonly CatalogTabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
};

export function CatalogTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: CatalogTabsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 border-b border-border/70 pb-px",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/[0.08] text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

type CatalogTabsPanelProps = {
  children: ReactNode;
  className?: string;
};

export function CatalogTabsPanel({ children, className }: CatalogTabsPanelProps) {
  return <div className={cn("pt-4", className)}>{children}</div>;
}
