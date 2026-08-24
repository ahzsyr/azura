"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CatalogFilterButtonProps = {
  onClick?: () => void;
  activeCount?: number;
  className?: string;
  label?: string;
};

export function CatalogFilterButton({
  onClick,
  activeCount = 0,
  className,
  label = "Filters",
}: CatalogFilterButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("gap-1.5", className)}
    >
      <SlidersHorizontal className="h-3.5 w-3.5" />
      {label}
      {activeCount > 0 ? (
        <span className="rounded-md bg-primary/15 px-1.5 text-[11px] font-semibold text-primary">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
}
