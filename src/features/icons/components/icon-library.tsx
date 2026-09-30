"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Icon } from "./icon";
import { IconCard } from "./icon-card";
import { IconDetailPanel } from "./icon-detail-panel";
import { IconUploadDialog } from "./icon-upload-dialog";
import { FontRegistrationDialog } from "./font-registration-dialog";
import { builtinIcons } from "../lib/builtin-icons";
import type { IconListItem } from "../types";

type SourceFilter = "ALL" | "BUILTIN" | "CUSTOM" | "FONT";

type Props = {
  initialIconId?: string | null;
  onIconIdChange?: (iconId: string | null) => void;
};

export function IconLibrary({ initialIconId = null, onIconIdChange }: Props) {
  const [icons, setIcons] = useState<IconListItem[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(initialIconId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const registryFallback = (q: string): IconListItem[] => {
    const query = q.trim().toLowerCase();
    return Object.values(builtinIcons)
      .filter((e) => {
        if (!query) return true;
        return (
          e.id.includes(query) ||
          e.name.toLowerCase().includes(query) ||
          (e.category ?? "").includes(query)
        );
      })
      .map((e) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        source: "builtin",
        category: e.category,
        type: "COMPONENT",
      }));
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setDetailId(initialIconId);
  }, [initialIconId]);

  const selectIcon = (iconId: string) => {
    setDetailId(iconId);
    onIconIdChange?.(iconId);
  };

  const clearDetail = () => {
    setDetailId(null);
    onIconIdChange?.(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (sourceFilter !== "ALL") params.set("source", sourceFilter);
      const res = await fetch(`/api/icons/list?${params.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { icons?: IconListItem[] };
      setIcons(json.icons?.length ? json.icons : registryFallback(debouncedSearch));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sourceFilter, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = {
    builtin: icons.filter((i) => i.source === "builtin"),
    custom: icons.filter((i) => i.source === "custom"),
    font: icons.filter((i) => i.source === "font"),
  };

  const handleDelete = async (iconId: string) => {
    if (!confirm("Delete this icon?")) return;
    const res = await fetch(`/api/icons/delete?iconId=${encodeURIComponent(iconId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      alert(json.error ?? "Delete failed");
      return;
    }
    if (detailId === iconId) clearDetail();
    setRefreshKey((k) => k + 1);
  };

  const renderSection = (title: string, items: IconListItem[]) => {
    if (!items.length) return null;
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{title}</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-2.5">
          {items.map((icon) => (
            <div key={icon.id} className="relative group">
              <IconCard
                iconId={icon.id}
                name={icon.name}
                source={icon.source}
                category={icon.category ?? null}
                selected={detailId === icon.id}
                onSelect={() => selectIcon(icon.id)}
              />
              {icon.source !== "builtin" ? (
                <button
                  type="button"
                  title="Delete icon"
                  className="absolute -top-1 -end-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(icon.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Icon Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Built-in Lucide icons, custom sanitized SVGs, and registered font glyphs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
            Upload SVG
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setFontOpen(true)}>
            Register font
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search icons…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
        >
          <option value="ALL">All sources</option>
          <option value="BUILTIN">Built-in</option>
          <option value="CUSTOM">Custom SVG</option>
          <option value="FONT">Font icons</option>
        </select>
        <Badge variant="outline">{icons.length} icons</Badge>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6 min-w-0">
          {loading && icons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading icons…</p>
          ) : sourceFilter === "ALL" ? (
            <>
              {renderSection("Built-in", grouped.builtin)}
              {renderSection("Custom", grouped.custom)}
              {renderSection("Font icons", grouped.font)}
            </>
          ) : (
            renderSection("Results", icons)
          )}
          {!loading && icons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
              No icons match your filters.
            </p>
          ) : null}
        </div>

        <IconDetailPanel
          iconId={detailId}
          onClose={clearDetail}
          onDelete={detailId && icons.find((i) => i.id === detailId)?.source !== "builtin" ? () => void handleDelete(detailId) : undefined}
        />
      </div>

      <IconUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => setRefreshKey((k) => k + 1)}
      />
      <FontRegistrationDialog
        open={fontOpen}
        onOpenChange={setFontOpen}
        onRegistered={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
