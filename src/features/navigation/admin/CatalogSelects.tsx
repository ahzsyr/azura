"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/builder/constants";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";
import { resolveMediaUrl } from "@/features/media/constants";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatPageLabel(
  slug: string,
  title: string,
  status?: "DRAFT" | "PUBLISHED",
): string {
  const wiredPath = CMS_WIRED_MARKETING_SLUGS[slug];
  let label = wiredPath ? `${title} (catalog · ${wiredPath})` : title;
  if (status === "DRAFT") {
    label = `${label} (draft)`;
  }
  return label;
}

function pageSubtitle(slug: string, status?: "DRAFT" | "PUBLISHED"): string {
  const wiredPath = CMS_WIRED_MARKETING_SLUGS[slug];
  const path = wiredPath ?? `/${slug}`;
  return status === "DRAFT" ? `${path} · draft` : path;
}

/** Ensures current value appears even if missing from catalog (legacy JSON). */
function pageOptions(catalog: HeaderBuilderCatalog, current: string): CatalogOption[] {
  const opts = catalog.pages.map((p) => ({
    value: p.slug,
    label: p.title,
    subtitle: pageSubtitle(p.slug, p.status),
  }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)`, subtitle: `/${current}` });
  }
  return opts.length ? opts : [{ value: "home", label: "Home", subtitle: "/home" }];
}

function collectionOptions(catalog: HeaderBuilderCatalog, current: string): CatalogOption[] {
  const opts = catalog.collections.map((c) => ({
    value: c.slug,
    label: c.name,
    subtitle: `/${c.slug}`,
  }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)`, subtitle: `/${current}` });
  }
  return opts;
}

function productOptions(catalog: HeaderBuilderCatalog, current: string): CatalogOption[] {
  const opts = catalog.products.map((p) => ({
    value: p.slug,
    label: p.name,
    subtitle: `/${p.slug}`,
  }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)`, subtitle: `/${current}` });
  }
  return opts;
}

function brandOptions(catalog: HeaderBuilderCatalog, current: string): CatalogOption[] {
  const opts: CatalogOption[] = catalog.brands.map((b) => ({
    value: b.slug,
    label: b.name,
    subtitle: `/${b.slug}`,
    imageUrl: b.logoUrl?.trim() || undefined,
  }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)`, subtitle: `/${current}` });
  }
  return opts;
}

function tagOptions(catalog: HeaderBuilderCatalog, current: string): CatalogOption[] {
  const opts = catalog.tags.map((t) => ({
    value: t.slug,
    label: t.name,
    subtitle: `/${t.slug}`,
  }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)`, subtitle: `/${current}` });
  }
  return opts;
}

export type CatalogOption = { value: string; label: string; subtitle?: string; imageUrl?: string };

function filterOptions(options: CatalogOption[], query: string): CatalogOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      o.value.toLowerCase().includes(q) ||
      (o.subtitle?.toLowerCase().includes(q) ?? false),
  );
}

/**
 * Modern searchable catalog list (button rows) — replaces native &lt;select size&gt; picker.
 */
export function SearchableCatalogSelect({
  id,
  options,
  value,
  onChange,
  emptyMessage,
  loading,
  className,
}: {
  id: string;
  options: CatalogOption[];
  value: string;
  onChange: (nextValue: string) => void;
  emptyMessage: string;
  loading?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  const selectedIdx = filtered.findIndex((o) => o.value === value);
  const activeHighlight =
    filtered.length === 0
      ? 0
      : Math.min(Math.max(highlight, 0), filtered.length - 1);

  const selectAt = useCallback(
    (index: number) => {
      const row = filtered[index];
      if (row) onChange(row.value);
    },
    [filtered, onChange],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectAt(activeHighlight);
    } else if (e.key === "Escape") {
      setQuery("");
      setHighlight(0);
    }
  };

  const selected = options.find((o) => o.value === value);
  const visualHighlight = selectedIdx >= 0 && highlight === 0 && query === "" ? selectedIdx : activeHighlight;

  if (loading) {
    return (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground" aria-busy>
        Loading…
      </div>
    );
  }

  return (
    <div className={cn("mb-picker hb-catalog-picker space-y-2", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`${id}-search`}
          type="search"
          className="ps-8"
          placeholder="Search by name or slug…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          aria-controls={id}
        />
      </div>

      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2 text-sm">
          {selected.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(selected.imageUrl)}
              alt=""
              className="h-8 w-8 shrink-0 rounded-md border bg-background object-contain p-0.5"
              decoding="async"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{selected.label}</p>
            {selected.subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{selected.subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Clear selection"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div
        id={id}
        role="listbox"
        aria-label="Results"
        className="max-h-[min(320px,40vh)] overflow-auto rounded-xl border bg-card"
        tabIndex={-1}
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          filtered.map((o, i) => {
            const isSelected = o.value === value;
            const isHighlighted = i === visualHighlight;
            return (
              <button
                key={o.value || `empty-${i}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b px-3 py-2.5 text-start transition-colors last:border-b-0",
                  isSelected && "bg-primary/10",
                  isHighlighted && !isSelected && "bg-muted/60",
                  !isSelected && "hover:bg-muted/40",
                )}
                onClick={() => onChange(o.value)}
                onMouseEnter={() => setHighlight(i)}
              >
                {o.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(o.imageUrl)}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-md border bg-background object-contain p-0.5"
                    decoding="async"
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{o.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {o.subtitle ?? (o.value ? `/${o.value}` : "\u00a0")}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function PageSelect({
  catalog,
  id,
  value,
  onChange,
}: {
  catalog: HeaderBuilderCatalog;
  id: string;
  value: string;
  onChange: (slug: string) => void;
}) {
  const opts = pageOptions(catalog, value);
  return (
    <SearchableCatalogSelect
      id={id}
      options={opts}
      value={value}
      onChange={onChange}
      emptyMessage="No pages found. Try another name or slug."
    />
  );
}

export function CollectionSelect({
  catalog,
  id,
  value,
  onChange,
}: {
  catalog: HeaderBuilderCatalog;
  id: string;
  value: string;
  onChange: (slug: string) => void;
}) {
  const opts = collectionOptions(catalog, value);
  return (
    <SearchableCatalogSelect
      id={id}
      options={opts}
      value={value}
      onChange={onChange}
      emptyMessage="No collections found."
    />
  );
}

export function ProductSelect({
  catalog,
  id,
  value,
  onChange,
}: {
  catalog: HeaderBuilderCatalog;
  id: string;
  value: string;
  onChange: (slug: string) => void;
}) {
  const opts = productOptions(catalog, value);
  return (
    <SearchableCatalogSelect
      id={id}
      options={opts}
      value={value}
      onChange={onChange}
      emptyMessage="No products found. Try another name or slug."
    />
  );
}

export function BrandSelect({
  catalog,
  id,
  value,
  onChange,
}: {
  catalog: HeaderBuilderCatalog;
  id: string;
  value: string;
  onChange: (slug: string) => void;
}) {
  const opts = brandOptions(catalog, value);
  return (
    <SearchableCatalogSelect
      id={id}
      options={opts}
      value={value}
      onChange={onChange}
      emptyMessage="No brands found."
    />
  );
}

export function TagSelect({
  catalog,
  id,
  value,
  onChange,
}: {
  catalog: HeaderBuilderCatalog;
  id: string;
  value: string;
  onChange: (slug: string) => void;
}) {
  const opts = tagOptions(catalog, value);
  return (
    <SearchableCatalogSelect
      id={id}
      options={opts}
      value={value}
      onChange={onChange}
      emptyMessage="No tags found."
    />
  );
}

// Kept for any callers that still format a combined page label string.
export { formatPageLabel };
