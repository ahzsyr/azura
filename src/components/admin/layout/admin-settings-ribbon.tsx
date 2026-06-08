"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
    "relative shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
    isActive
      ? "admin-ribbon-tab-active text-foreground"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );

export function AdminSettingsRibbon({
  tabs,
  activeTab,
  onTabChange,
  className,
  layoutId = "settings-ribbon-indicator",
  linkNavigation = false,
}: AdminSettingsRibbonProps) {
  const reduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const setSettingsActiveTab = useAdminUiStore((s) => s.setSettingsActiveTab);
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    setMotionReady(true);
  }, []);

  useEffect(() => {
    setSettingsActiveTab(activeTab);
    return () => setSettingsActiveTab(null);
  }, [activeTab, setSettingsActiveTab]);

  useEffect(() => {
    const el = tabRefs.current.get(activeTab);
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab, reduced]);

  return (
    <div
      className={cn(
        "admin-liquid-glass sticky top-12 z-20 border-b shadow-sm",
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
          const indicatorClass =
            "absolute inset-x-1 -bottom-2 h-0.5 rounded-full bg-primary pointer-events-none";
          const indicator = isActive ? (
            motionReady && !reduced ? (
              <motion.span
                layoutId={layoutId}
                className={indicatorClass}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            ) : (
              <span className={indicatorClass} aria-hidden />
            )
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
  children: React.ReactNode;
  className?: string;
};

export function AdminSettingsSection({ id, children, className }: AdminSettingsSectionProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div role="tabpanel" id={`tabpanel-${id}`} aria-labelledby={`tab-${id}`} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      key={id}
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
