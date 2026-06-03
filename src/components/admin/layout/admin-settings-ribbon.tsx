"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { cn } from "@/lib/utils";

export type SettingsRibbonTab = {
  id: string;
  label: string;
  href?: string;
};

type AdminSettingsRibbonProps = {
  tabs: SettingsRibbonTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  layoutId?: string;
  linkNavigation?: boolean;
};

const tabClassName = (isActive: boolean) =>
  cn(
    "relative shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export function AdminSettingsRibbon({
  tabs,
  activeTab,
  onTabChange,
  className,
  layoutId = "settings-ribbon-indicator",
  linkNavigation = false,
}: AdminSettingsRibbonProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const setSettingsActiveTab = useAdminUiStore((s) => s.setSettingsActiveTab);

  useEffect(() => {
    setSettingsActiveTab(activeTab);
    return () => setSettingsActiveTab(null);
  }, [activeTab, setSettingsActiveTab]);

  useEffect(() => {
    const el = tabRefs.current.get(activeTab);
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab]);

  return (
    <div
      className={cn(
        "sticky top-12 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className
      )}
    >
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-none"
        role="tablist"
        aria-label="Settings sections"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const indicator = isActive ? (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-x-1 -bottom-2 h-0.5 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          ) : null;

          if (linkNavigation && tab.href) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                  else tabRefs.current.delete(tab.id);
                }}
                role="tab"
                aria-selected={isActive}
                className={tabClassName(isActive)}
              >
                {tab.label}
                {indicator}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={tabClassName(isActive)}
            >
              {tab.label}
              {indicator}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type AdminSettingsSectionProps = {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
};

export function AdminSettingsSection({
  id,
  activeTab,
  children,
  className,
}: AdminSettingsSectionProps) {
  if (id !== activeTab) return null;

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      role="tabpanel"
      className={className}
    >
      {children}
    </motion.div>
  );
}
