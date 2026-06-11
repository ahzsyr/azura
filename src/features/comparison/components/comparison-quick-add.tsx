"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompareItemSnapshot } from "@/features/comparison/types";
import {
  getCompareIdsForType,
  toggleCompareList,
} from "@/features/comparison/comparison-store";

type Props = {
  contentTypeSlug: string;
  apiSegment: string;
  maxItems: number;
  locale: string;
  localePrefix: string;
  label: string;
  placeholder: string;
  onAdded: () => void;
  collections?: { slug: string; label: string }[];
};

export function ComparisonQuickAdd({
  contentTypeSlug,
  apiSegment,
  maxItems,
  locale,
  localePrefix,
  label,
  placeholder,
  onAdded,
  collections = [],
}: Props) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [results, setResults] = useState<CompareItemSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const syncSelected = useCallback(() => {
    setSelectedIds(getCompareIdsForType(contentTypeSlug));
  }, [contentTypeSlug]);

  useEffect(() => {
    syncSelected();
  }, [syncSelected]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 && !collection) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: q || "*", limit: "12", locale: localePrefix });
        if (collection) params.set("collection", collection);
        if (tagFilter.trim()) params.set("tags", tagFilter.trim());
        const res = await fetch(`/api/compare/${apiSegment}/search?${params}`);
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { items?: CompareItemSnapshot[] };
        setResults(data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query, apiSegment, localePrefix, collection, tagFilter]);

  const titleFor = (item: CompareItemSnapshot) =>
    locale.startsWith("ar") ? item.titleAr : item.titleEn;

  const onToggle = (itemId: string) => {
    toggleCompareList(contentTypeSlug, itemId, maxItems);
    syncSelected();
    onAdded();
  };

  const atMax = selectedIds.length >= maxItems;

  return (
    <div className="cmp-quick-add">
      <p className="cmp-quick-add__label">{label}</p>
      <div className="cmp-quick-add__filters">
        <input
          type="search"
          className="cmp-search cmp-quick-add__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {collections.length > 0 ? (
          <select
            className="cmp-search"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            aria-label="Filter by collection"
          >
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="text"
          className="cmp-search"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="Tags (comma-separated)"
          aria-label="Filter by tags"
        />
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
          …
        </p>
      ) : null}
      {results.length > 0 ? (
        <ul id="cmp-quick-add-list" className="cmp-quick-add__list" role="listbox">
          {results.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`cmp-quick-add__option${selected ? " is-selected" : ""}`}
                  role="option"
                  aria-selected={selected}
                  disabled={!selected && atMax}
                  onClick={() => onToggle(item.id)}
                >
                  <span>{titleFor(item)}</span>
                  <span className="cmp-quick-add__state">{selected ? "✓" : "+"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {atMax && (query.length >= 2 || collection) ? (
        <p className="text-xs text-muted-foreground mt-1">
          Maximum {maxItems} items
        </p>
      ) : null}
    </div>
  );
}
