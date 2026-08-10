"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import {
  AdminSettingsRibbon,
  AdminSettingsSection,
  type SettingsRibbonTab,
} from "./admin-settings-ribbon";
import { cn } from "@/lib/utils";

// ── Status dot colors (mirrors admin-settings-ribbon.tsx) ─────────────────────

const STATUS_DOT: Record<string, string> = {
  connected:    "bg-emerald-500",
  error:        "bg-red-500",
  warning:      "bg-amber-400",
  setup:        "bg-sky-400",
  disconnected: "bg-muted-foreground/40",
};

// ── Sidebar navigation ────────────────────────────────────────────────────────

function SidebarNav({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: SettingsRibbonTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.id === tabId);
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const next = tabs[(idx + dir + tabs.length) % tabs.length];
    onTabChange(next.id);
    setTimeout(() => btnRefs.current.get(next.id)?.focus(), 0);
  };

  return (
    <nav
      className="rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm p-1.5"
      aria-label="Settings sections"
    >
      <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-0.5">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) btnRefs.current.set(tab.id, el);
                else btnRefs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`sidebar-tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                "flex items-center w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-primary/12 text-primary border border-primary/25 shadow-sm"
                  : "text-muted-foreground border border-transparent hover:bg-muted/60 hover:text-foreground",
              )}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
            >
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.status && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "ml-2 size-2 rounded-full flex-shrink-0",
                    STATUS_DOT[tab.status] ?? "bg-muted-foreground/40",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ── Layout component ──────────────────────────────────────────────────────────

type AdminSettingsLayoutProps = {
  tabs: SettingsRibbonTab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: (activeTab: string) => ReactNode;
  className?: string;
  /** Unique Framer Motion layoutId when multiple ribbons coexist on one page. */
  layoutId?: string;
  /** Optional content rendered below the tab ribbon (ribbon mode only). */
  ribbonFooter?: ReactNode;
  /**
   * Navigation presentation.
   * - `"ribbon"` (default) — sticky top tab bar.
   * - `"sidebar"` — sticky left column, matching the product-editor panel nav.
   */
  layout?: "ribbon" | "sidebar";
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
  layout = "ribbon",
}: AdminSettingsLayoutProps) {
  const [internalTab, setInternalTab] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeTab = controlledTab ?? internalTab;
  const handleTabChange = onTabChange ?? setInternalTab;

  // ── Sidebar layout ──────────────────────────────────────────────────────────
  if (layout === "sidebar") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-[minmax(200px,240px)_minmax(0,1fr)] gap-5 items-start",
          className,
        )}
      >
        {/* Sidebar nav — sticky on desktop, stacks above content on mobile */}
        <aside className="md:sticky md:top-[4.5rem] md:self-start md:max-h-[calc(100dvh-5.5rem)] md:overflow-y-auto">
          <SidebarNav tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
        </aside>

        {/* Content panel */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <AdminSettingsSection key={activeTab} id={activeTab}>
              {children(activeTab)}
            </AdminSettingsSection>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Ribbon layout (original) ────────────────────────────────────────────────
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
