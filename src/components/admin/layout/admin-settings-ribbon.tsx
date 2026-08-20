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
  /**
   * `scroll` — primary sticky page ribbon with underline indicator.
   * `wrap` — full-width segmented pills.
   * `sub` — inline nested ribbon (non-sticky, compact pills).
   */
  variant?: "scroll" | "wrap" | "sub";
  /** When false, the scroll ribbon is not sticky (prefer `variant="sub"` for nested ribbons). */
  sticky?: boolean;
};

const STATUS_DOT: Record<NonNullable<SettingsRibbonTab["status"]>, string> = {
  connected:    "bg-emerald-500",
  error:        "bg-red-500",
  warning:      "bg-amber-400",
  setup:        "bg-sky-400",
  disconnected: "bg-muted-foreground/50",
};

const scrollTabClassName = (isActive: boolean) =>
  cn(
    "admin-ribbon-tab relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
    isActive
      ? "admin-ribbon-tab-active font-medium text-foreground"
      : "font-normal text-muted-foreground hover:text-foreground",
  );

const wrapTabClassName = (isActive: boolean) =>
  cn(
    "relative z-0 inline-flex flex-1 min-w-[5.75rem] items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs tracking-tight transition-[color,transform,font-weight] duration-150 sm:min-w-0 sm:px-3 sm:py-2.5 sm:text-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
    isActive
      ? "font-semibold text-foreground"
      : "font-medium text-muted-foreground hover:text-foreground/90 active:scale-[0.98]",
  );

const subTabClassName = (isActive: boolean) =>
  cn(
    "relative z-0 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-[color,font-weight] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
    isActive
      ? "font-medium text-foreground"
      : "font-normal text-muted-foreground hover:text-foreground/90",
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
  variant = "scroll",
  sticky = variant === "scroll",
}: AdminSettingsRibbonProps) {
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const setSettingsActiveTab = useAdminUiStore((s) => s.setSettingsActiveTab);
  const [motionReady, setMotionReady] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isWrap = variant === "wrap";
  const isSub = variant === "sub";
  const isScroll = variant === "scroll";

  useEffect(() => {
    setMotionReady(true);
  }, []);

  useEffect(() => {
    setSettingsActiveTab(activeTab);
    return () => setSettingsActiveTab(null);
  }, [activeTab, setSettingsActiveTab]);

  useEffect(() => {
    if (isWrap || isSub) return;
    const el = tabRefs.current.get(activeTab);
    if (el && scrollRef.current) {
      el.scrollIntoView({
        behavior: shouldReduceMotion || shouldSimplifyMotion ? "auto" : "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeTab, isWrap, isSub, shouldReduceMotion, shouldSimplifyMotion]);

  // ── Scroll overflow detection ──────────────────────────────────────────────
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollWidth - clientWidth - scrollLeft > 4);
  }, []);

  useEffect(() => {
    if (isWrap || isSub) return;
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
  }, [isWrap, isSub, updateScrollState]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  }, []);

  const handleTabKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx < 0) return;
    let nextIdx = idx;
    if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = tabs.length - 1;
    else nextIdx = (idx + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[nextIdx];
    onTabChange(next.id);
    setTimeout(() => tabRefs.current.get(next.id)?.focus(), 0);
  };

  const renderTab = (tab: SettingsRibbonTab) => {
    const isActive = tab.id === activeTab;
    const tabClass = isWrap
      ? wrapTabClassName(isActive)
      : isSub
        ? subTabClassName(isActive)
        : scrollTabClassName(isActive);
    const scrollIndicatorClass =
      "admin-ribbon-tab-indicator absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary pointer-events-none";
    const wrapIndicator =
      isWrap && isActive ? (
        motionReady && !shouldReduceMotion && !shouldSimplifyMotion ? (
          <motion.span
            layoutId={`${layoutId}-pill`}
            className="absolute inset-0 -z-10 rounded-lg bg-background shadow-[0_1px_2px_oklch(0_0_0/0.06),0_4px_12px_-4px_oklch(0_0_0/0.08)] ring-1 ring-border/50"
            transition={{ type: "spring", stiffness: 480, damping: 36 }}
            aria-hidden
          />
        ) : (
          <span
            className="absolute inset-0 -z-10 rounded-lg bg-background shadow-[0_1px_2px_oklch(0_0_0/0.06),0_4px_12px_-4px_oklch(0_0_0/0.08)] ring-1 ring-border/50"
            aria-hidden
          />
        )
      ) : null;
    const subIndicator =
      isSub && isActive ? (
        motionReady && !shouldReduceMotion && !shouldSimplifyMotion ? (
          <motion.span
            layoutId={`${layoutId}-sub-pill`}
            className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm ring-1 ring-border/40"
            transition={{ type: "spring", stiffness: 480, damping: 36 }}
            aria-hidden
          />
        ) : (
          <span
            className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm ring-1 ring-border/40"
            aria-hidden
          />
        )
      ) : null;
    const scrollIndicator =
      isScroll && isActive ? (
        motionReady && !shouldReduceMotion && !shouldSimplifyMotion ? (
          <motion.span
            layoutId={layoutId}
            className={scrollIndicatorClass}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        ) : (
          <span className={scrollIndicatorClass} aria-hidden />
        )
      ) : null;
    const indicator = isWrap ? wrapIndicator : isSub ? subIndicator : scrollIndicator;

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
          id={`tab-${tab.id}`}
          aria-selected={isActive}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={isActive ? 0 : -1}
          className={tabClass}
          onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
        >
          {indicator}
          {tab.label}
          <StatusDot status={tab.status} />
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
        id={`tab-${tab.id}`}
        aria-selected={isActive}
        aria-controls={`tabpanel-${tab.id}`}
        tabIndex={isActive ? 0 : -1}
        onClick={() => onTabChange(tab.id)}
        onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
        className={tabClass}
      >
        {indicator}
        {tab.label}
        <StatusDot status={tab.status} />
      </button>
    );
  };

  if (isSub) {
    return (
      <nav
        className={cn(
          "admin-ribbon-sub inline-flex w-fit max-w-full rounded-lg border border-border/50 bg-muted/25 p-1",
          className,
        )}
        aria-label="Settings sections"
      >
        <div role="tablist" className="flex flex-wrap gap-0.5">
          {tabs.map(renderTab)}
        </div>
      </nav>
    );
  }

  if (isWrap) {
    return (
      <nav
        className={cn(
          "w-full rounded-2xl border border-border/50 bg-muted/35 p-1 shadow-[inset_0_1px_0_oklch(1_0_0/0.45)] backdrop-blur-sm",
          className,
        )}
        aria-label="Settings sections"
      >
        <div
          role="tablist"
          className="flex w-full flex-wrap gap-0.5 sm:flex-nowrap sm:gap-1"
        >
          {tabs.map(renderTab)}
        </div>
      </nav>
    );
  }

  return (
    <div
      className={cn(
        "admin-ribbon-scroll relative border-b border-border/60 bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background/75",
        sticky && "sticky top-12 z-20",
        className,
      )}
    >
      {canScrollLeft && (
        <ChevronButton dir="left" onClick={() => scrollBy(-1)} />
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex gap-0.5 overflow-x-auto scrollbar-none",
          canScrollLeft ? "pl-9" : "pl-4",
          canScrollRight ? "pr-9" : "pr-4",
        )}
        role="tablist"
        aria-label="Settings sections"
      >
        {tabs.map(renderTab)}
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
      initial={false}
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
