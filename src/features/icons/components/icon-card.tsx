"use client";

import { Icon } from "./icon";
import { cn } from "@/lib/utils";

type Props = {
  iconId: string;
  name?: string;
  source?: "builtin" | "custom" | "font";
  category?: string | null;
  selected?: boolean;
  onSelect?: () => void;
};

export function IconCard({ iconId, name, source, category, selected, onSelect }: Props) {
  // Card fills its grid cell so the picker never overflows horizontally.
  const description = (category ?? (source ? source : "")) || "";

  return (
    <button
      type="button"
      title={name ?? iconId}
      onClick={onSelect}
      className={cn(
        "relative flex w-full flex-col items-center rounded-lg border px-1.5 py-2.5 text-center transition-colors",
        "min-h-[112px]",
        "hover:bg-muted/40",
        selected
          ? "border-primary/60 bg-primary/5"
          : "border-border/60 bg-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
      )}
    >
      {selected ? (
        <span className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] border border-primary/20">
          ✓
        </span>
      ) : null}

      <span className="flex h-12 w-full items-center justify-center">
        <Icon iconId={iconId} className="h-8 w-8" />
      </span>

      <span className="mt-1.5 w-full truncate px-0.5 text-xs font-semibold leading-tight">
        {name ?? iconId}
      </span>

      <span className="mt-0.5 w-full truncate px-0.5 text-[10px] text-muted-foreground leading-tight">
        {description}
      </span>
    </button>
  );
}
