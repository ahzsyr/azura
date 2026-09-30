"use client";

import { useMemo, useState } from "react";
import type {
  CollectionBuilderOption,
  ProductBuilderOption,
} from "@/features/builder/blocks/commerce/product-blocks/types";

type CatalogOption = { value: string; label: string };

function collectionDepth(
  slug: string,
  bySlug: Map<string, CollectionBuilderOption>,
): number {
  const seen = new Set<string>();
  let depth = 0;
  let parent = bySlug.get(slug)?.parentSlug;
  while (parent && bySlug.has(parent) && !seen.has(parent)) {
    seen.add(parent);
    depth += 1;
    parent = bySlug.get(parent)?.parentSlug;
    if (depth > 64) break;
  }
  return depth;
}

function toCollectionOptions(
  collections: CollectionBuilderOption[],
  current: string,
): CatalogOption[] {
  const bySlug = new Map(collections.map((c) => [c.slug, c]));
  const opts = collections.map((c) => {
    const depth = collectionDepth(c.slug, bySlug);
    const prefix = depth > 0 ? `${"\u00A0".repeat(depth * 2)}↳ ` : "";
    const hidden = !c.visible ? " (hidden)" : "";
    return { value: c.slug, label: `${prefix}${c.label}${hidden}` };
  });
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)` });
  }
  return opts;
}

function toProductOptions(products: ProductBuilderOption[], current: string): CatalogOption[] {
  const opts = products.map((p) => ({ value: p.slug, label: p.label }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)` });
  }
  return opts;
}

function SearchableSingleSelect({
  id,
  options,
  value,
  onChange,
  emptyMessage,
}: {
  id: string;
  options: CatalogOption[];
  value: string;
  onChange: (nextValue: string) => void;
  emptyMessage: string;
}) {
  const [q, setQ] = useState("");
  const qn = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    const base =
      !qn.length
        ? options
        : options.filter(
            (o) =>
              o.label.toLowerCase().includes(qn) ||
              o.value.toLowerCase().includes(qn),
          );
    if (value && !base.some((o) => o.value === value)) {
      const cur = options.find((o) => o.value === value);
      if (cur) return [cur, ...base];
    }
    return base;
  }, [options, qn, value]);

  const displayOptions = useMemo(() => {
    if (filtered.length > 0) return filtered;
    if (value) {
      const current = options.find((o) => o.value === value);
      if (current) return [current];
    }
    return [];
  }, [filtered, options, value]);

  const rowCount = displayOptions.length || 1;
  const size = Math.min(12, Math.max(rowCount, 3));

  return (
    <div className="space-y-1.5">
      <input
        type="search"
        className="w-full border rounded-md h-9 px-2 text-sm"
        placeholder="Search by name or slug…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-controls={id}
        autoComplete="off"
      />
      <select
        id={id}
        className="w-full border rounded-md px-2 text-sm"
        size={size}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {displayOptions.length === 0 ? (
          <option value="">{emptyMessage}</option>
        ) : (
          displayOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

export function CollectionBuilderSelect({
  id,
  collections,
  value,
  onChange,
}: {
  id: string;
  collections: CollectionBuilderOption[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const opts = toCollectionOptions(collections, value);
  return (
    <SearchableSingleSelect
      id={id}
      options={opts}
      value={value}
      onChange={onChange}
      emptyMessage="No collections available"
    />
  );
}

export function ProductBuilderSelect({
  id,
  products,
  value,
  onChange,
}: {
  id: string;
  products: ProductBuilderOption[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const opts = toProductOptions(products, value);
  return (
    <SearchableSingleSelect
      id={id}
      options={opts}
      value={value}
      onChange={onChange}
      emptyMessage="No products available"
    />
  );
}

export function ProductBuilderMultiSelect({
  id,
  products,
  value,
  onChange,
  max,
}: {
  id: string;
  products: ProductBuilderOption[];
  value: string[];
  onChange: (slugs: string[]) => void;
  max?: number;
}) {
  const [q, setQ] = useState("");
  const qn = q.trim().toLowerCase();
  const selected = new Set(value);

  const options = useMemo(() => {
    const base = products.map((p) => ({ value: p.slug, label: p.label }));
    for (const slug of value) {
      if (!base.some((o) => o.value === slug)) {
        base.unshift({ value: slug, label: `${slug} (custom)` });
      }
    }
    return base;
  }, [products, value]);

  const filtered = useMemo(() => {
    if (!qn.length) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(qn) ||
        o.value.toLowerCase().includes(qn),
    );
  }, [options, qn]);

  const toggle = (slug: string) => {
    if (selected.has(slug)) {
      onChange(value.filter((s) => s !== slug));
      return;
    }
    if (max != null && value.length >= max) return;
    onChange([...value, slug]);
  };

  return (
    <div className="space-y-2">
      <input
        type="search"
        className="w-full border rounded-md h-9 px-2 text-sm"
        placeholder="Search products…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-controls={id}
        autoComplete="off"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((slug) => {
            const label = options.find((o) => o.value === slug)?.label ?? slug;
            return (
              <button
                key={slug}
                type="button"
                className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs"
                onClick={() => toggle(slug)}
                title="Remove"
              >
                {label}
                <span aria-hidden>×</span>
              </button>
            );
          })}
        </div>
      )}
      <div
        id={id}
        className="max-h-48 overflow-y-auto rounded-md border divide-y text-sm"
        role="listbox"
        aria-multiselectable
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No products match</p>
        ) : (
          filtered.map((o) => {
            const isSelected = selected.has(o.value);
            const disabled = !isSelected && max != null && value.length >= max;
            return (
              <label
                key={o.value}
                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/30 ${
                  disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => toggle(o.value)}
                />
                <span className="truncate">{o.label}</span>
              </label>
            );
          })
        )}
      </div>
      {max != null && (
        <p className="text-xs text-muted-foreground">
          {value.length} / {max} selected
        </p>
      )}
    </div>
  );
}
