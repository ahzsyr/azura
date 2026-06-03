import { useMemo, useState } from "react";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";

/** Ensures current value appears even if missing from catalog (legacy JSON). */
function pageOptions(catalog: HeaderBuilderCatalog, current: string) {
  const opts = catalog.pages.map((p) => ({ value: p.slug, label: p.title }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)` });
  }
  return opts.length ? opts : [{ value: "home", label: "Home" }];
}

function collectionOptions(catalog: HeaderBuilderCatalog, current: string) {
  const opts = catalog.collections.map((c) => ({ value: c.slug, label: c.name }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)` });
  }
  return opts;
}

function productOptions(catalog: HeaderBuilderCatalog, current: string) {
  const opts = catalog.products.map((p) => ({ value: p.slug, label: p.name }));
  if (current && !opts.some((o) => o.value === current)) {
    opts.unshift({ value: current, label: `${current} (custom)` });
  }
  return opts;
}

type CatalogOption = { value: string; label: string };

function SearchableCatalogSelect({
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

  const rowCount = filtered.length || 1;
  const size = Math.min(14, Math.max(rowCount, 3));

  return (
    <div className="hb-catalog-picker">
      <input
        type="search"
        className="hb-catalog-picker__search"
        placeholder="Search by name or slug…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-controls={id}
        autoComplete="off"
      />
      <select
        id={id}
        className="hb-catalog-picker__list"
        size={size}
        value={filtered.some((o) => o.value === value) ? value : filtered[0]?.value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {filtered.length === 0 ? (
          <option value="">{emptyMessage}</option>
        ) : (
          filtered.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        )}
      </select>
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
      emptyMessage="No pages"
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
      emptyMessage="No collections"
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
      emptyMessage="No products"
    />
  );
}
