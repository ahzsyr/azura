"use client";

import type { SearchResultHit } from "@/capabilities/search/components/discovery/search-result-card-router";
import { SearchResultCardRouter } from "@/capabilities/search/components/discovery/search-result-card-router";
import type {
  SearchResultCardFields,
  SearchResultCardStyle,
} from "@/capabilities/search/lib/search-page-layout";
import type { ProductSearchCardDisplay } from "@/features/products/lib/product-search-display";
import { searchCopy, type SearchLocale } from "@/capabilities/search/components/search-ui/search-copy";
import { cn } from "@/lib/utils";
import Image from "next/image";

type Props = {
  locale: SearchLocale;
  hit: SearchResultHit | null;
  entityLabel?: string;
  className?: string;
  cardStyle?: SearchResultCardStyle;
  cardFields?: SearchResultCardFields;
  defaultProductCardDisplay?: ProductSearchCardDisplay;
};

export function SearchPreviewPanel({
  locale,
  hit,
  entityLabel,
  className,
  cardStyle,
  cardFields,
  defaultProductCardDisplay,
}: Props) {
  const t = searchCopy(locale);
  const coverUrl = hit?.card?.imageUrl;
  const previewCardFields = coverUrl
    ? {
        image: false,
        price: cardFields?.price ?? true,
        rating: cardFields?.rating ?? true,
        brand: cardFields?.brand ?? true,
        snippet: cardFields?.snippet ?? true,
        entityLabel: cardFields?.entityLabel ?? true,
      }
    : cardFields;

  if (!hit) {
    return (
      <aside
        className={cn(
          "hidden min-h-[320px] rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 lg:sticky lg:top-36 lg:block lg:max-h-[calc(100vh-10rem)] lg:w-[42%] lg:self-start lg:overflow-y-auto",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          Hover a result to preview
        </p>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "hidden rounded-xl border border-border/50 bg-card/40 p-4 lg:sticky lg:top-36 lg:block lg:max-h-[calc(100vh-10rem)] lg:w-[42%] lg:self-start lg:overflow-y-auto",
        className
      )}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t.preview}
      </p>
      {coverUrl ? (
        <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-lg bg-muted">
          <Image
            src={coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 40vw, 100vw"
            unoptimized
          />
        </div>
      ) : null}
      <SearchResultCardRouter
        hit={hit}
        entityLabel={entityLabel}
        cardStyle={cardStyle}
        cardFields={previewCardFields}
        defaultProductCardDisplay={defaultProductCardDisplay}
        className="border-0 bg-transparent p-0"
      />
    </aside>
  );
}
