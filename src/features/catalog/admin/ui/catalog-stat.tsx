"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CatalogStatProps = {
  label: string;
  value: ReactNode;
  active?: boolean;
  warn?: boolean;
  onClick?: () => void;
  className?: string;
};

export function CatalogStat({
  label,
  value,
  active,
  warn,
  onClick,
  className,
}: CatalogStatProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex min-w-[5.5rem] flex-col items-start rounded-xl border px-3 py-2 text-start transition-colors",
        "border-border/80 bg-background",
        onClick && "hover:border-primary/30 hover:bg-primary/[0.04]",
        active && "border-primary/35 bg-primary/[0.08] text-foreground",
        warn && !active && "border-amber-500/30 bg-amber-500/[0.06]",
        className,
      )}
    >
      <span className="text-lg font-semibold tabular-nums leading-none">{value}</span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </Comp>
  );
}

type CatalogStatGroupProps = {
  children: ReactNode;
  className?: string;
};

export function CatalogStatGroup({ children, className }: CatalogStatGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>
  );
}
