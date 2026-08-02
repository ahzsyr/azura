"use client";

import {
  FileText,
  FolderOpen,
  HelpCircle,
  Image,
  Layers,
  MessageSquare,
  Package,
  ShoppingBag,
  Tag,
  ArrowUpRight,
} from "lucide-react";
import type { SearchEntityType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { highlightMatches } from "@/capabilities/search/core/text";

const ENTITY_ICONS: Partial<Record<SearchEntityType, typeof Package>> = {
  CATALOG_PRODUCT: ShoppingBag,
  CATALOG_COLLECTION: FolderOpen,
  CATALOG_CATEGORY: Tag,
  CONTENT_ITEM: Package,
  CONTENT_TYPE: Layers,
  CONTENT_COLLECTION: FolderOpen,
  CMS_PAGE: FileText,
  POST: MessageSquare,
  FAQ: HelpCircle,
  MEDIA: Image,
  TESTIMONIAL: MessageSquare,
};

type Props = {
  title: string;
  meta?: string;
  snippet?: string;
  query?: string;
  showPreview?: boolean;
  selected?: boolean;
  index?: number;
  className?: string;
  entityType?: SearchEntityType;
  onClick?: () => void;
  as?: "button" | "div";
};

export function SearchResultCard({
  title,
  meta,
  snippet,
  query,
  showPreview = true,
  selected,
  index = 0,
  className,
  entityType,
  onClick,
  as: Tag = "button",
}: Props) {
  const Icon = entityType ? (ENTITY_ICONS[entityType] ?? Package) : Package;
  const highlightedSnippet =
    snippet && query && showPreview ? highlightMatches(snippet, query) : snippet;

  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          {meta ? (
            <span className="shrink-0 rounded-md bg-muted/80 px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
              {meta}
            </span>
          ) : null}
        </span>
        {highlightedSnippet && showPreview ? (
          <span
            className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground [&_mark]:rounded-sm [&_mark]:bg-primary/15 [&_mark]:px-0.5 [&_mark]:font-medium [&_mark]:text-foreground"
            dangerouslySetInnerHTML={{ __html: highlightedSnippet }}
          />
        ) : null}
      </span>
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary sm:opacity-0 sm:group-hover:opacity-100"
        aria-hidden
      />
    </>
  );

  const baseClass = cn(
    "sm-search-hit group flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-start transition-colors",
    "hover:border-border/60 hover:bg-muted/40",
    selected && "border-primary/30 bg-muted/50",
    className
  );

  const style =
    index > 0
      ? { animationDelay: `${Math.min(index, 8) * 30}ms` }
      : undefined;

  if (Tag === "div") {
    return (
      <div
        role="option"
        aria-selected={selected}
        className={baseClass}
        style={style}
        onClick={onClick}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-selected={selected}
      className={baseClass}
      style={style}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
