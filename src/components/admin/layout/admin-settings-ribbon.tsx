"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useConstrainedMotion, ADMIN_MOTION_MOBILE } from "@/hooks/use-constrained-motion";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { cn } from "@/lib/utils";

export type SettingsRibbonTab = {
  id: string;
  label: string;
  href?: string;
  /** Optional connection/health status shown as a small colored dot after the label. */
  status?: "connected" | "error" | "warning" | "setup" | "disconnected";
};

type AdminSettingsRibbonProps = {
  tabs: SettingsRibbonTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  layoutId?: string;
  linkNavigation?: boolean;
};

const STATUS_DOT: Record<NonNullable<SettingsRibbonTab["status"]>, string> = {
  connected:    "bg-emerald-500",
  error:        "bg-red-500",
  warning:      "bg-amber-400",
  setup:        "bg-sky-400",
  disconnected: "bg-muted-foreground/50",
};

const tabClassName = (isActive: boolean) =>
  cn(
    "relative inline-flex items-center gap-1.5 shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
    isActive
      ? "admin-ribbon-tab-active text-foreground"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );

function StatusDot({ status }: { status: SettingsRibbonTab["status"] }) {
  if (!status) return null;
  return (
    <span
      className={cn("size-1.5 rounded-full flex-shrink-0", STATUS_DOT[status])}
      aria-hidden="true"
    />
  );
}

function ChevronButton({
  dir,
  onClick,
}: {
  dir: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={dir === "left" ? "Scroll tabs left" : "Scroll tabs right"}
      onClick={onClick}
      className={cn(
        "absolute inset-y-0 z-20 flex items-center justify-center",
        "w-8 transition-opacity duration-150",
        dir === "left" ? "left-0" : "right-0",
      )}
    >
      {/* Gradient fade behind the button */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 w-full pointer-events-none",
          dir === "left"
            ? "bg-gradient-to-r from-background/95 to-transparent"
            : "bg-gradient-to-l from-background/95 to-transparent",
        )}
      />
      <span
        className={cn(
          "relative z-10 flex h-6 w-6 items-center justify-center rounded-full",
          "border border-border/60 bg-background text-muted-foreground shadow-sm",
          "text-base leading-none hover:text-foreground transition-colors",
        )}
      >
        {dir === "left" ? "‹" : "›"}
      </span>
    </button>
  );
}

export function AdminSettingsRibbon({
  tabs,
  activeTab,
  onTabChange,
  className,
  layoutId = "settings-ribbon-indicator",
  linkNavigation = false,
}: AdminSettingsRibbonProps) {
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const setSettingsActiveTab = useAdminUiStore((s) => s.setSettingsActiveTab);
  const [motionReady, setMotionReady] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
      el.scrollIntoView({
        behavior: shouldReduceMotion || shouldSimplifyMotion ? "auto" : "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeTab, shouldReduceMotion, shouldSimplifyMotion]);

  // ── Scroll overflow detection ──────────────────────────────────────────────
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollWidth - clientWidth - scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  }, []);

  return (
    <div
      className={cn(
        "admin-liquid-glass sticky top-12 z-20 border-b shadow-sm relative",
        className,
      )}
    >
      {canScrollLeft && (
        <ChevronButton dir="left" onClick={() => scrollBy(-1)} />
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex gap-1 overflow-x-auto py-2 scrollbar-none",
          canScrollLeft ? "pl-9" : "pl-4",
          canScrollRight ? "pr-9" : "pr-4",
        )}
        role="tablist"
        aria-label="Settings sections"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const indicatorClass =
            "absolute inset-x-1 -bottom-2 h-0.5 rounded-full bg-primary pointer-events-none";
          const indicator = isActive ? (
            motionReady && !shouldReduceMotion && !shouldSimplifyMotion ? (
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
                <StatusDot status={tab.status} />
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
              <StatusDot status={tab.status} />
              {indicator}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <ChevronButton dir="right" onClick={() => scrollBy(1)} />
      )}
    </div>
  );
}

type AdminSettingsSectionProps = {
  id: string;
  children: React.ReactNode;
  className?: string;
};

export function AdminSettingsSection({ id, children, className }: AdminSettingsSectionProps) {
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const osReduced = useReducedMotion();

  if (shouldReduceMotion || osReduced) {
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
      transition={{
        duration: shouldSimplifyMotion ? ADMIN_MOTION_MOBILE.enterDuration : 0.2,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
