"use client";

import type { SearchResultHit } from "@/features/search/components/discovery/search-result-card-router";
import { SearchResultCardRouter } from "@/features/search/components/discovery/search-result-card-router";
import { searchCopy, type SearchLocale } from "@/features/search/components/search-ui/search-copy";
import { cn } from "@/lib/utils";

type Props = {
  locale: SearchLocale;
  hit: SearchResultHit | null;
  entityLabel?: string;
  className?: string;
};

export function SearchPreviewPanel({ locale, hit, entityLabel, className }: Props) {
  const t = searchCopy(locale);

  if (!hit) {
    return (
      <aside
        className={cn(
          "hidden min-h-[320px] rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 lg:block lg:w-[42%]",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          {locale === "ar" ? "مرّر فوق نتيجة للمعاينة" : "Hover a result to preview"}
        </p>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "hidden rounded-xl border border-border/50 bg-card/40 p-4 lg:block lg:w-[42%]",
        className
      )}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t.preview}
      </p>
      <SearchResultCardRouter hit={hit} entityLabel={entityLabel} className="border-0 bg-transparent p-0" />
    </aside>
  );
}
