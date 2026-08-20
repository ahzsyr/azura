"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CatalogToolbarProps = {
  children: ReactNode;
  className?: string;
};

export function CatalogToolbar({ children, className }: CatalogToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
  );
}
