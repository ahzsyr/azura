"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { DiscoveryItem } from "@/features/discovery-blocks/lib/recently-viewed.types";
import { entityTypeBadge } from "@/features/discovery-blocks/lib/entity-labels";

export { entityTypeBadge };

type Props = {
  item: DiscoveryItem;
  locale: string;
  highlightQuery?: string;
  layout?: "grid" | "list";
  className?: string;
};

function highlightText(text: string, query?: string): ReactNode {
  if (!query?.trim()) return text;
  const q = query.trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/15 px-0.5 text-inherit">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function DiscoveryItemCard({
  item,
  locale,
  highlightQuery,
  layout = "grid",
  className,
}: Props) {
  const isList = layout === "list";

  return (
    <Link
      href={item.urlPath}
      className={cn(
        "group flex gap-3 rounded-xl border border-border/60 bg-card/50 p-3 transition-colors hover:border-primary/30 hover:bg-card",
        isList && "items-center",
        !isList && "flex-col",
        className
      )}
    >
      {item.imageUrl ? (
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg bg-muted",
            isList ? "h-14 w-14" : "aspect-[4/3] w-full"
          )}
        >
          <Image
            src={item.imageUrl}
            alt=""
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
            sizes={isList ? "56px" : "(max-width: 768px) 50vw, 200px"}
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        {item.badge ? (
          <span className="mb-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {item.badge}
          </span>
        ) : null}
        <p className="font-medium text-sm leading-snug line-clamp-2">
          {highlightText(item.title, highlightQuery)}
        </p>
        {item.snippet && isList ? (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{item.snippet}</p>
        ) : null}
      </div>
    </Link>
  );
}
