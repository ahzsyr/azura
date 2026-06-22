"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export type TaxonomyTab = {
  slug: string;
  label: string;
  count?: number;
  iconUrl?: string;
  imageUrl?: string;
};

type Props = {
  tabs: TaxonomyTab[];
  activeSlug: string;
  onChange: (slug: string) => void;
  navStyle: "horizontal" | "vertical" | "pills" | "mega" | "icons";
  showCounts?: boolean;
  ariaLabel?: string;
};

export function TaxonomyTabsShell({
  tabs,
  activeSlug,
  onChange,
  navStyle,
  showCounts = true,
  ariaLabel = "Browse tabs",
}: Props) {
  if (tabs.length === 0) return null;

  const isVertical = navStyle === "vertical";
  const isPills = navStyle === "pills";
  const isIcons = navStyle === "icons";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-2",
        isVertical ? "flex-col w-full max-w-xs" : "flex-row flex-wrap overflow-x-auto pb-1",
      )}
    >
      {tabs.map((tab) => {
        const active = tab.slug === activeSlug;
        return (
          <button
            key={tab.slug}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.slug)}
            className={cn(
              "inline-flex items-center gap-2 shrink-0 transition-colors text-sm font-medium",
              isPills
                ? cn(
                    "rounded-full px-4 py-2",
                    active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
                  )
                : isIcons
                  ? cn(
                      "flex-col rounded-xl p-2 min-w-[4.5rem]",
                      active ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
                    )
                  : cn(
                      "border-b-2 px-3 py-2",
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    ),
              navStyle === "mega" && "rounded-lg border px-4 py-3",
              navStyle === "mega" && active && "border-primary bg-primary/5",
            )}
          >
            {isIcons && (tab.iconUrl || tab.imageUrl) ? (
              <span className="relative h-8 w-8 overflow-hidden rounded-full bg-muted">
                <Image src={tab.iconUrl || tab.imageUrl || ""} alt="" fill className="object-contain p-1" />
              </span>
            ) : null}
            <span>{tab.label}</span>
            {showCounts && tab.count != null ? (
              <span className="text-xs opacity-70">({tab.count})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
