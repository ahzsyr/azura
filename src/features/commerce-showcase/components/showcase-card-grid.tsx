"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type ShowcaseCardItem = {
  slug: string;
  name: string;
  href: string;
  imageUrl?: string;
  iconUrl?: string;
  description?: string;
  count?: number;
  featured?: boolean;
};

type Props = {
  items: ShowcaseCardItem[];
  layout?: "grid" | "masonry" | "list" | "cards" | "megaTiles" | "banner" | "icons";
  columns?: 2 | 3 | 4 | 5 | 6;
  showImages?: boolean;
  showCounts?: boolean;
  showDescriptions?: boolean;
  grayscale?: boolean;
};

export function ShowcaseCardGrid({
  items,
  layout = "grid",
  columns = 4,
  showImages = true,
  showCounts = true,
  showDescriptions = false,
  grayscale = false,
}: Props) {
  if (items.length === 0) return null;

  const colClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : columns === 5
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          : columns === 6
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            : columns === 4
              ? "grid-cols-2 sm:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3";

  if (layout === "list") {
    return (
      <ul className="divide-y rounded-xl border border-border/60">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={item.href}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/40"
            >
              {showImages && (item.iconUrl || item.imageUrl) ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={item.iconUrl || item.imageUrl || ""}
                    alt=""
                    fill
                    className={cn("object-contain p-1", grayscale && "grayscale opacity-80")}
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                {showDescriptions && item.description ? (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                ) : null}
              </div>
              {showCounts && item.count != null ? (
                <span className="text-xs text-muted-foreground">{item.count}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  if (layout === "icons") {
    return (
      <div className={cn("grid gap-4", colClass)}>
        {items.map((item) => (
          <Link
            key={item.slug}
            href={item.href}
            className="group flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-muted/40"
          >
            <div className="relative h-14 w-14 overflow-hidden rounded-full border bg-card">
              {item.iconUrl || item.imageUrl ? (
                <Image
                  src={item.iconUrl || item.imageUrl || ""}
                  alt=""
                  fill
                  className={cn("object-contain p-2", grayscale && "grayscale")}
                />
              ) : (
                <span className="flex h-full items-center justify-center text-lg font-semibold text-muted-foreground">
                  {item.name.charAt(0)}
                </span>
              )}
            </div>
            <p className="text-xs font-medium">{item.name}</p>
            {showCounts && item.count != null ? (
              <p className="text-[10px] text-muted-foreground">{item.count} items</p>
            ) : null}
          </Link>
        ))}
      </div>
    );
  }

  const isMega = layout === "megaTiles";
  const isBanner = layout === "banner";

  return (
    <div className={cn("grid gap-4", layout === "masonry" ? "columns-2 sm:columns-3 gap-4 space-y-4" : colClass)}>
      {items.map((item) => (
        <Link
          key={item.slug}
          href={item.href}
          className={cn(
            "group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/50 transition-all hover:border-primary/30 hover:shadow-sm",
            isMega && "sm:col-span-1",
            layout === "masonry" && "break-inside-avoid mb-4",
            item.featured && "ring-1 ring-primary/20",
          )}
        >
          {showImages && item.imageUrl ? (
            <div
              className={cn(
                "relative bg-muted",
                isBanner ? "aspect-[21/9]" : isMega ? "aspect-[4/3]" : "aspect-[16/10]",
              )}
            >
              <Image
                src={item.imageUrl}
                alt=""
                fill
                className="object-cover transition-transform group-hover:scale-[1.02]"
                sizes="240px"
              />
            </div>
          ) : null}
          <div className={cn("p-3", layout === "cards" && "flex flex-1 flex-col")}>
            <p className="font-medium text-sm">{item.name}</p>
            {showDescriptions && item.description ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            ) : null}
            {showCounts && item.count != null ? (
              <p className="text-xs text-muted-foreground mt-0.5">{item.count} items</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
