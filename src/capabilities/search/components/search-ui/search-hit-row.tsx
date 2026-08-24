"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  meta?: string;
  snippet?: string;
  showPreview?: boolean;
  selected?: boolean;
  index?: number;
  className?: string;
  onClick?: () => void;
  as?: "button" | "div";
};

export function SearchHitRow({
  title,
  meta,
  snippet,
  showPreview = true,
  selected,
  index = 0,
  className,
  onClick,
  as = "button",
}: Props) {
  const Comp = as;
  return (
    <Comp
      type={as === "button" ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "sm-search-hit group flex w-full gap-3 border px-3 py-2.5 text-start transition-colors",
        selected
          ? "border-primary/30 bg-primary/8"
          : "border-transparent hover:border-border/80 hover:bg-muted/50",
        className
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
      aria-selected={selected}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug tracking-tight">{title}</p>
        {meta ? (
          <p className="mt-0.5 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
            {meta}
          </p>
        ) : null}
        {showPreview && snippet ? (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {snippet}
          </p>
        ) : null}
      </div>
      <ArrowUpRight
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        aria-hidden
      />
    </Comp>
  );
}
