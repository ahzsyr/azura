"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchSpinner({ className, label }: { className?: string; label?: string }) {
  return (
    <Loader2
      className={cn("h-4 w-4 animate-spin text-primary", className)}
      aria-hidden={!label}
      aria-label={label}
      role={label ? "status" : undefined}
    />
  );
}
