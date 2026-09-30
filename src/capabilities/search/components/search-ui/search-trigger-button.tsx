"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  className?: string;
  showShortcut?: boolean;
  onClick: () => void;
};

export function SearchTriggerButton({ label, className, showShortcut = true, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 rounded-full border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/25 hover:bg-muted/50 hover:text-foreground",
        className
      )}
      aria-label={label}
      aria-haspopup="dialog"
    >
      <Search className="h-4 w-4 shrink-0 opacity-70 transition-transform group-hover:scale-105" />
      <span className="hidden sm:inline">{label}</span>
      {showShortcut ? (
        <kbd className="hidden rounded border border-border/80 bg-background/80 px-1.5 py-0.5 font-mono text-[0.65rem] opacity-70 sm:inline">
          ⌘K
        </kbd>
      ) : null}
    </button>
  );
}
