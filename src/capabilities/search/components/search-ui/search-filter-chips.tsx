"use client";

import { cn } from "@/lib/utils";

export type SearchChip = {
  id: string;
  label: string;
  active?: boolean;
  onClick: () => void;
};

type Props = {
  chips: SearchChip[];
  className?: string;
  size?: "sm" | "md";
  groupLabel?: string;
};

export function SearchFilterChips({ chips, className, size = "sm", groupLabel }: Props) {
  if (!chips.length) return null;
  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      role="group"
      aria-label={groupLabel}
    >
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onClick}
          aria-pressed={chip.active}
          className={cn(
            "sm-search-chip rounded-full border font-medium transition-all duration-150",
            size === "sm" ? "min-h-[32px] px-2.5 py-1 text-xs" : "min-h-[44px] px-3 py-1.5 text-sm",
            chip.active
              ? "border-primary bg-primary font-semibold text-primary-foreground shadow-sm ring-2 ring-primary/25"
              : "border-border/70 bg-background text-muted-foreground hover:border-border hover:bg-muted/80 hover:text-foreground"
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
