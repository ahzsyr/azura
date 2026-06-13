"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import type { SearchEntityType } from "@prisma/client";
import type { SearchCardPayload } from "@/features/search/types/search-card";
import { cn } from "@/lib/utils";
import { highlightMatches } from "@/features/search/core/text";

export type SearchResultHit = {
  id: string;
  entityId?: string;
  title: string;
  snippet?: string;
  urlPath: string;
  entityType: SearchEntityType;
  card?: SearchCardPayload;
  facets?: Record<string, string | string[] | number | boolean>;
};

type Props = {
  hit: SearchResultHit;
  query?: string;
  entityLabel?: string;
  className?: string;
  selected?: boolean;
  onSelect?: () => void;
};

function formatPrice(card?: SearchCardPayload): string | null {
  if (!card?.price) return null;
  const { min, max, currency } = card.price;
  const sym = currency === "SAR" ? "SAR " : currency === "USD" ? "$" : "";
  if (max != null && max !== min) return `${sym}${min} – ${sym}${max}`;
  return `${sym}${min}`;
}

export function SearchResultCardRouter({
  hit,
  query,
  entityLabel,
  className,
  selected,
  onSelect,
}: Props) {
  const card = hit.card;
  const price = formatPrice(card);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "flex gap-3 rounded-xl border border-border/50 bg-card/60 p-3 transition-colors hover:bg-muted/40",
        selected && "ring-2 ring-primary/40 bg-muted/30",
        className
      )}
    >
      {card?.imageUrl ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={card.imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="64px"
            unoptimized
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        {entityLabel ? (
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {entityLabel}
          </p>
        ) : null}
        <h3
          className="font-medium leading-snug [&_mark]:rounded-sm [&_mark]:bg-primary/15 [&_mark]:px-0.5"
          {...(query
            ? {
                dangerouslySetInnerHTML: {
                  __html: highlightMatches(hit.title, query),
                },
              }
            : { children: hit.title })}
        />

        {card?.rating ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
            {card.rating.value.toFixed(1)}
            {card.rating.count > 0 ? ` (${card.rating.count})` : null}
          </p>
        ) : null}

        {card?.brand ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{card.brand}</p>
        ) : null}

        {price ? <p className="mt-1 text-sm font-semibold text-primary">{price}</p> : null}

        {card?.productCount != null ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {card.productCount} products
          </p>
        ) : null}

        {card?.readTimeMinutes ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {card.readTimeMinutes} min read
          </p>
        ) : null}

        {hit.snippet ? (
          <p
            className="mt-1 line-clamp-2 text-xs text-muted-foreground [&_mark]:rounded-sm [&_mark]:bg-primary/15 [&_mark]:px-0.5"
            {...(query
              ? {
                  dangerouslySetInnerHTML: {
                    __html: highlightMatches(hit.snippet, query),
                  },
                }
              : { children: hit.snippet })}
          />
        ) : null}
      </div>
    </article>
  );
}
