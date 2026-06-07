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
};

export function SearchFilterChips({ chips, className, size = "sm" }: Props) {
  if (!chips.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="group">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onClick}
          aria-pressed={chip.active}
          className={cn(
            "sm-search-chip rounded-full border font-medium transition-all duration-150",
            size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
            chip.active
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "hover:border-border hover:bg-muted/80 hover:text-foreground"
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
