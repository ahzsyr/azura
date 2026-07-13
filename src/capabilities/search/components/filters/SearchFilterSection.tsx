"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchFilterChips } from "@/capabilities/search/components/search-ui/search-filter-chips";
import { searchCopy, type SearchLocale } from "@/capabilities/search/components/search-ui/search-copy";

const MAX_VISIBLE = 6;

type Props = {
  locale: SearchLocale;
  label: string;
  filterId: string;
  options: string[];
  activeValues: string[];
  onToggle: (value: string) => void;
  defaultOpen?: boolean;
};

export function SearchFilterSection({
  locale,
  label,
  options,
  activeValues,
  onToggle,
  defaultOpen = true,
}: Props) {
  const t = searchCopy(locale);
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(false);

  if (!options.length) return null;

  const visible = expanded ? options : options.slice(0, MAX_VISIBLE);
  const hasMore = options.length > MAX_VISIBLE;
  const sectionActive = activeValues.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border bg-background/50 transition-colors",
        sectionActive ? "border-primary/35 bg-primary/5" : "border-border/50"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start"
        aria-expanded={open}
      >
        <span
          className={cn(
            "text-[0.65rem] font-semibold uppercase tracking-wider",
            sectionActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          {label}
          {activeValues.length > 0 ? (
            <span className="ms-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground">
              {activeValues.length}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-border/40 px-3 py-2.5">
          <SearchFilterChips
            size="md"
            chips={visible.map((value) => ({
              id: value,
              label: value,
              active: activeValues.includes(value),
              onClick: () => onToggle(value),
            }))}
          />
          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {expanded ? t.showLess : t.showMore(options.length - MAX_VISIBLE)}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
