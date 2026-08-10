"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Presentation wrapper for catalog tables.
 * Keeps DataTable engine; modernizes surrounding chrome.
 */
type CatalogDataGridProps = {
  children: ReactNode;
  className?: string;
};

export function CatalogDataGrid({ children, className }: CatalogDataGridProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-background [&_.dt-wrap]:rounded-none [&_.dt-wrap]:border-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

type CatalogCategoryChipProps = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function CatalogCategoryChip({ label, href, onClick }: CatalogCategoryChipProps) {
  const className =
    "inline-flex items-center rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-primary/[0.08]";

  if (href) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {label}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}
