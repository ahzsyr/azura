"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/marketing/section";
import { CompositeVisualStage } from "@/features/builder/blocks/marketing/components/composite-visual-stage";
import { TabbedShowcasePanel } from "@/features/builder/blocks/marketing/components/tabbed-showcase-panel";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import type { TabbedShowcaseTab } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  tabs: TabbedShowcaseTab[];
  showNavArrows?: boolean;
  locale?: string;
};

function TabPills({
  tabs,
  activeTabId,
  onChange,
  locale,
  className,
}: {
  tabs: TabbedShowcaseTab[];
  activeTabId: string;
  onChange: (tabId: string) => void;
  locale: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Showcase tabs"
      className={cn(
        "flex w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        const label = resolveItemField(tab, "label", locale) || tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function TabbedShowcaseView({
  title,
  tabs,
  showNavArrows = true,
  locale = "en",
}: Props) {
  const reduceMotion = useReducedMotion();
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => resolveItemField(tab, "label", locale) || tab.title || tab.features.length > 0),
    [locale, tabs],
  );

  const [activeTabId, setActiveTabId] = useState(visibleTabs[0]?.id ?? "");

  useEffect(() => {
    if (visibleTabs.length === 0) {
      setActiveTabId("");
      return;
    }
    if (!visibleTabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(visibleTabs[0].id);
    }
  }, [activeTabId, visibleTabs]);

  if (visibleTabs.length === 0) return null;

  const activeIndex = visibleTabs.findIndex((tab) => tab.id === activeTabId);
  const activeTab = visibleTabs[Math.max(activeIndex, 0)];

  const goTo = (index: number) => {
    const wrapped = (index + visibleTabs.length) % visibleTabs.length;
    setActiveTabId(visibleTabs[wrapped].id);
  };

  return (
    <div className="mx-auto max-w-6xl">
      {title ? (
        <div className="mb-8 text-center">
          <SectionHeader title={title} />
        </div>
      ) : null}

      <div className="mb-6 hidden justify-center lg:flex">
        <TabPills
          tabs={visibleTabs}
          activeTabId={activeTab.id}
          onChange={setActiveTabId}
          locale={locale}
          className="flex-wrap justify-center"
        />
      </div>

      <div className="relative rounded-3xl bg-muted/40 p-6 md:p-10 lg:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.35 }}
            className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12"
          >
            <TabbedShowcasePanel tab={activeTab} locale={locale} />

            <div className="relative">
              <CompositeVisualStage visual={activeTab.visual} isActive />

              {showNavArrows && visibleTabs.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous tab"
                    onClick={() => goTo(activeIndex - 1)}
                    className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next tab"
                    onClick={() => goTo(activeIndex + 1)}
                    className="absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex justify-center lg:hidden">
        <TabPills
          tabs={visibleTabs}
          activeTabId={activeTab.id}
          onChange={setActiveTabId}
          locale={locale}
          className="max-w-full snap-x snap-mandatory"
        />
      </div>
    </div>
  );
}
