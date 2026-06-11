"use client";

import { Command } from "cmdk";
import type { SearchEntityType } from "@prisma/client";
import type { AutocompleteHit } from "@/features/search/components/search-autocomplete.types";
import { SearchResultCard } from "@/features/search/components/panel/SearchResultCard";
import { searchCopy, type SearchLocale } from "@/features/search/components/search-ui/search-copy";

type Props = {
  locale: SearchLocale;
  entityType: SearchEntityType;
  label: string;
  items: AutocompleteHit[];
  query: string;
  showPreview: boolean;
  onNavigate: (hit: AutocompleteHit, searchQ?: string) => void;
};

export function SearchResultGroup({
  locale,
  entityType,
  label,
  items,
  query,
  showPreview,
  onNavigate,
}: Props) {
  const t = searchCopy(locale);
  if (!items.length) return null;

  return (
    <Command.Group
      heading={
        <span className="flex items-center justify-between gap-2">
          <span>{label}</span>
          <span className="text-[0.65rem] font-normal normal-case tracking-normal text-muted-foreground">
            {t.resultCount(items.length)}
          </span>
        </span>
      }
    >
      {items.map((r, i) => (
        <Command.Item
          key={r.id ?? r.urlPath}
          value={`result:${r.id ?? r.urlPath}`}
          onSelect={() => onNavigate(r, query)}
          className="p-0 aria-selected:bg-transparent"
        >
          <SearchResultCard
            as="div"
            title={r.title}
            meta={label}
            snippet={r.snippet}
            query={query}
            showPreview={showPreview}
            entityType={entityType}
            index={i}
            className="w-full"
          />
        </Command.Item>
      ))}
    </Command.Group>
  );
}
