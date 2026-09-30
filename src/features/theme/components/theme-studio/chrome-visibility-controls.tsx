"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChromeVisibilityMode } from "@/schemas/theme";
import {
  CHROME_VISIBILITY_MODE_OPTIONS,
  getStaticChromePageOptions,
  type ChromePageOption,
} from "@/features/theme/chrome-page-options";
import { ThemeSelect } from "./controls/theme-select";

type ChromeVisibilityValue = {
  enabled: boolean;
  visibilityMode: ChromeVisibilityMode;
  pagePaths: string[];
};

type Props = {
  label: string;
  description: string;
  builderHref: string;
  builderLabel: string;
  value: ChromeVisibilityValue;
  pages?: ChromePageOption[];
  onChange: (patch: Partial<ChromeVisibilityValue>) => void;
  searchTerms?: string[];
};

export function ChromeVisibilityControls({
  label,
  description,
  builderHref,
  builderLabel,
  value,
  pages,
  onChange,
  searchTerms = [],
}: Props) {
  const [query, setQuery] = useState("");
  const options = pages && pages.length > 0 ? pages : getStaticChromePageOptions();
  const normalizedQuery = query.trim().toLowerCase();

  const grouped = useMemo(() => {
    const filtered = options.filter((option) => {
      if (!normalizedQuery) return true;
      return `${option.title} ${option.path} ${option.group}`.toLowerCase().includes(normalizedQuery);
    });
    const groups = new Map<string, ChromePageOption[]>();
    for (const option of filtered) {
      const list = groups.get(option.group) ?? [];
      list.push(option);
      groups.set(option.group, list);
    }
    return [...groups.entries()];
  }, [options, normalizedQuery]);

  const selected = new Set(value.pagePaths);
  const showPagePicker = value.enabled && value.visibilityMode !== "all";

  const togglePath = (path: string, checked: boolean) => {
    const next = checked
      ? [...value.pagePaths, path].filter((item, index, all) => all.indexOf(item) === index)
      : value.pagePaths.filter((item) => item !== path);
    onChange({ pagePaths: next });
  };

  return (
    <div
      className="space-y-4"
      data-theme-search={[label, description, "header", "footer", "pages", ...searchTerms]
        .join(" ")
        .toLowerCase()}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor={`chrome-enabled-${label}`}>{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <input
          id={`chrome-enabled-${label}`}
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="mt-1 size-4 shrink-0 rounded border"
        />
      </div>

      {value.enabled ? (
        <ThemeSelect
          label="Show on"
          value={value.visibilityMode}
          options={[...CHROME_VISIBILITY_MODE_OPTIONS]}
          onChange={(visibilityMode) =>
            onChange({ visibilityMode: visibilityMode as ChromeVisibilityMode })
          }
          searchTerms={["pages", "visibility", label]}
        />
      ) : (
        <p className="text-xs text-muted-foreground">Hidden on every public page.</p>
      )}

      {showPagePicker ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages…"
              className="h-9 pl-8"
              aria-label={`Search pages for ${label}`}
            />
          </div>
          {value.pagePaths.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {value.visibilityMode === "selected"
                ? "Select one or more pages. Until then, this still shows everywhere."
                : "Select pages to hide this chrome. Until then, it still shows everywhere."}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {value.pagePaths.length} page{value.pagePaths.length === 1 ? "" : "s"} selected.
            </p>
          )}
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {grouped.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pages match that search.</p>
            ) : (
              grouped.map(([group, items]) => (
                <div key={group}>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {group}
                  </p>
                  <ul className="space-y-1">
                    {items.map((item) => {
                      const id = `${label}-${item.path}`;
                      return (
                        <li key={item.path}>
                          <label
                            htmlFor={id}
                            className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/60"
                          >
                            <input
                              id={id}
                              type="checkbox"
                              className="mt-0.5 size-4 shrink-0 rounded border"
                              checked={selected.has(item.path)}
                              onChange={(e) => togglePath(item.path, e.target.checked)}
                            />
                            <span className="min-w-0">
                              <span className="block truncate">{item.title}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {item.path}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        <Link href={builderHref} className="underline underline-offset-2 hover:text-foreground">
          {builderLabel}
        </Link>
      </p>
    </div>
  );
}
