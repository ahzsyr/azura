"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { builtinIcons } from "../lib/builtin-icons";
import { IconCard } from "./icon-card";
import type { IconListItem } from "../types";

export type IconPickerSelectResult = {
  iconId: string;
  source: "builtin" | "custom" | "font";
};

type SourceFilter = "ALL" | "BUILTIN" | "CUSTOM" | "FONT";

type Props = {
  onSelect?: (result: IconPickerSelectResult) => void;
  active?: boolean;
  selectedId?: string | null;
  className?: string;
};

function registryFallback(search?: string): IconListItem[] {
  const q = search?.trim().toLowerCase();
  return Object.values(builtinIcons)
    .filter((e) => {
      if (!q) return true;
      return (
        e.id.includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.category ?? "").includes(q)
      );
    })
    .map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      source: "builtin" as const,
      category: e.category,
      type: "COMPONENT",
    }));
}

export function IconPickerPanel({ onSelect, active = true, selectedId, className }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [icons, setIcons] = useState<IconListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (sourceFilter !== "ALL") params.set("source", sourceFilter);
      const res = await fetch(`/api/icons/list?${params.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { icons?: IconListItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load icons");
      setIcons(json.icons?.length ? json.icons : registryFallback(debouncedSearch));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load icons");
      setIcons(registryFallback(debouncedSearch));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sourceFilter]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const grouped = useMemo(() => {
    const buckets: Record<string, IconListItem[]> = {
      builtin: [],
      custom: [],
      font: [],
    };
    for (const icon of icons) {
      buckets[icon.source]?.push(icon);
    }
    return buckets;
  }, [icons]);

  const handleSelect = (icon: IconListItem) => {
    onSelect?.({ iconId: icon.id, source: icon.source });
  };

  const iconGridClass =
    "grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-2.5";

  const renderSection = (title: string, items: IconListItem[]) => {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
        <div className={iconGridClass}>
          {items.map((icon) => (
            <IconCard
              key={icon.id}
              iconId={icon.id}
              name={icon.name}
              source={icon.source}
              category={icon.category ?? null}
              selected={selectedId === icon.id}
              onSelect={() => handleSelect(icon)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col gap-3 min-h-0 flex-1", className)}>
      <div className="flex flex-wrap gap-2 items-center shrink-0">
        <Input
          placeholder="Search icons…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[12rem] flex-1"
          aria-label="Search icons"
        />
        <select
          className="border rounded-md h-9 px-2 text-sm shrink-0"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
          aria-label="Filter by source"
        >
          <option value="ALL">All sources</option>
          <option value="BUILTIN">Built-in</option>
          <option value="CUSTOM">Custom SVG</option>
          <option value="FONT">Font icons</option>
        </select>
        {loading ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 space-y-4 py-1">
        {sourceFilter === "ALL" ? (
          <>
            {renderSection("Built-in", grouped.builtin)}
            {renderSection("Custom", grouped.custom)}
            {renderSection("Font icons", grouped.font)}
          </>
        ) : (
          <div className={iconGridClass}>
            {icons.map((icon) => (
              <IconCard
                key={icon.id}
                iconId={icon.id}
                name={icon.name}
                source={icon.source}
                category={icon.category ?? null}
                selected={selectedId === icon.id}
                onSelect={() => handleSelect(icon)}
              />
            ))}
          </div>
        )}
        {!loading && icons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No icons found.</p>
        ) : null}
      </div>
    </div>
  );
}
