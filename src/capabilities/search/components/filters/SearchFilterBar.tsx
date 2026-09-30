"use client";

import { X } from "lucide-react";
import { searchCopy, type SearchLocale } from "@/capabilities/search/components/search-ui/search-copy";

type Props = {
  locale: SearchLocale;
  count: number;
  onClearAll: () => void;
};

export function SearchFilterBar({ locale, count, onClearAll }: Props) {
  const t = searchCopy(locale);
  if (count <= 0) return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        {t.filtersActive(count)}
      </span>
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" aria-hidden />
        {t.clearAllFilters}
      </button>
    </div>
  );
}
