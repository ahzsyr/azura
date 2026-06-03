"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchSpinner } from "./search-spinner";

export type SearchInputStyle = "glass" | "solid" | "minimal";

type Props = {
  style?: SearchInputStyle;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  value?: string;
  onClear?: () => void;
};

export function SearchInputShell({
  style = "glass",
  children,
  className,
  loading,
  value,
  onClear,
}: Props) {
  const showClear = Boolean(value?.length && onClear);

  return (
    <div
      className={cn(
        "sm-search-shell",
        style === "glass" && "sm-search-shell--glass",
        style === "solid" && "sm-search-shell--solid",
        style === "minimal" && "sm-search-shell--minimal",
        className
      )}
    >
      {children}
      {loading ? <SearchSpinner className="shrink-0 opacity-80" /> : null}
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
