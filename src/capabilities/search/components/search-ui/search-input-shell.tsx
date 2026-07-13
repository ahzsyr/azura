"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchSpinner } from "./search-spinner";
import { searchCopy, type SearchLocale } from "./search-copy";

export type SearchInputStyle = "glass" | "solid" | "minimal";

type Props = {
  style?: SearchInputStyle;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  value?: string;
  onClear?: () => void;
  locale?: SearchLocale;
};

export function SearchInputShell({
  style = "glass",
  children,
  className,
  loading,
  value,
  onClear,
  locale = "en",
}: Props) {
  const t = searchCopy(locale);
  const showClear = Boolean(value?.trim().length && onClear);

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
          aria-label={t.clear}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
