"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProductCategoryOption } from "./product-category-assignment";

type ProductCategoryMultiSelectProps = {
  options: ProductCategoryOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Compact in-cell editor for the products table. */
  compact?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  onCommit?: () => void;
};

export function ProductCategoryMultiSelect({
  options,
  value,
  onChange,
  compact = false,
  autoFocus = false,
  disabled = false,
  onCommit,
}: ProductCategoryMultiSelectProps) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.slug.toLowerCase().includes(q),
    );
  }, [options, query]);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(selected.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  if (options.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", compact ? "px-1 py-1" : "")}>
        No categories yet.{" "}
        <a href="/admin/categories" className="text-primary underline">
          Manage Categories
        </a>
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        compact && "dt-inline-multiselect min-w-[220px] max-w-[320px]",
      )}
    >
      {options.length > 6 || compact ? (
        <input
          className={cn(
            compact ? "dt-inline-input" : "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm",
          )}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories…"
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label="Search categories"
        />
      ) : null}

      <div
        className={cn(
          "flex flex-wrap gap-1.5",
          compact && "max-h-44 overflow-y-auto rounded-md border border-border/70 p-1.5",
        )}
      >
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">No categories match.</p>
        ) : compact ? (
          filtered.map((opt) => {
            const checked = selected.has(opt.id);
            return (
              <label
                key={opt.id}
                className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-muted/70"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(opt.id)}
                />
                <span className="min-w-0 truncate">{opt.name}</span>
              </label>
            );
          })
        ) : (
          filtered.map((opt) => {
            const checked = selected.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                className={cn(
                  "pm-cat-toggle rounded-full border px-3 py-1 text-xs transition-colors",
                  checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
                onClick={() => toggle(opt.id)}
                aria-pressed={checked}
              >
                {opt.name}
              </button>
            );
          })
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {value.length === 0
          ? "No categories selected."
          : `${value.length} categor${value.length === 1 ? "y" : "ies"} selected.`}
        {compact && !onCommit ? " Enter or click away to save." : null}
      </p>
      {compact && onCommit ? (
        <button type="button" className="dt-inline-done" onClick={onCommit}>
          Done
        </button>
      ) : null}
    </div>
  );
}
