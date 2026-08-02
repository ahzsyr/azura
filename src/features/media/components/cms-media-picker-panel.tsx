"use client";

import { useCallback, useEffect, useState } from "react";
import type { MediaType } from "@prisma/client";
import { fetchMediaAssets } from "@/features/media/actions";
import type { MediaAssetRow } from "./media-asset-card";
import { MediaPreviewImage } from "@/features/media/components/media-preview-image";
import { formatBytes } from "@/features/media/media.service";
import { ALL_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { parseMediaTypesKey } from "@/features/media/lib/media-picker-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Film, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaPickResult } from "./media-picker-dialog";

type Props = {
  mediaTypes?: MediaType[];
  onSelect?: (asset: MediaPickResult) => void;
  onSelectMultiple?: (assets: MediaPickResult[]) => void;
  multi?: boolean;
  active?: boolean;
};

function toPickResult(asset: MediaAssetRow): MediaPickResult {
  return {
    id: asset.id,
    url: asset.url,
    filename: asset.filename,
    mediaType: asset.mediaType,
    altEn: asset.altEn ?? "",
    altAr: asset.altAr ?? "",
  };
}

export function CmsMediaPickerPanel({
  mediaTypes,
  onSelect,
  onSelectMultiple,
  multi = false,
  active = true,
}: Props) {
  const [assets, setAssets] = useState<MediaAssetRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const typesKey = mediaTypes?.join(",") ?? "";

  useEffect(() => {
    if (!active) return;
    setSelectedIds(new Set());
  }, [active]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const allowedTypes = parseMediaTypesKey(typesKey);
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchMediaAssets({
        search: debouncedSearch || undefined,
        mediaType:
          typeFilter !== "ALL"
            ? typeFilter
            : allowedTypes?.length === 1
              ? allowedTypes[0]
              : undefined,
      });
      const filtered = allowedTypes?.length
        ? rows.filter((a) => allowedTypes.includes(a.mediaType))
        : rows;
      setAssets(filtered as MediaAssetRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load media");
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, typeFilter, typesKey]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const types = mediaTypes ?? ALL_PICKER_MEDIA_TYPES;

  const toggleSelection = (asset: MediaAssetRow) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      return next;
    });
  };

  const handleAssetClick = (asset: MediaAssetRow) => {
    const pick = toPickResult(asset);
    if (multi) {
      toggleSelection(asset);
      return;
    }
    onSelect?.(pick);
  };

  const handleConfirmMultiple = () => {
    const selected = assets.filter((a) => selectedIds.has(a.id)).map(toPickResult);
    if (selected.length === 0) return;
    onSelectMultiple?.(selected);
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      <div className="flex flex-wrap gap-2 items-center shrink-0">
        <Input
          placeholder="Search by name, alt, or URL…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search media"
        />
        {types.length > 1 && (
          <select
            className="border rounded-md h-9 px-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MediaType | "ALL")}
            aria-label="Filter by media type"
          >
            <option value="ALL">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
        {isLoading && assets.length > 0 ? (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating…
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      ) : null}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && assets.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading media…
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
            {assets.map((asset) => {
              const isVisual = asset.mediaType === "IMAGE" || asset.mediaType === "SVG";
              const isSelected = multi && selectedIds.has(asset.id);
              return (
                <button
                  key={asset.id}
                  type="button"
                  className={cn(
                    "text-start border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/40 transition-shadow focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => handleAssetClick(asset)}
                  aria-pressed={isSelected}
                >
                  <div className="aspect-square relative bg-muted">
                    {isVisual ? (
                      <MediaPreviewImage
                        src={asset.url}
                        alt={asset.altEn || asset.filename}
                        fill
                        className="object-cover pointer-events-none"
                        sizes="150px"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
                        {asset.mediaType === "VIDEO" ? (
                          <Film className="h-6 w-6 text-muted-foreground" />
                        ) : (
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        )}
                        <span className="text-[10px]">{asset.mediaType}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs truncate font-medium">{asset.filename}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(asset.sizeBytes)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {!isLoading && !error && assets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No media found. Try a different search or upload files in Media Manager.
          </p>
        ) : null}
      </div>
      {multi ? (
        <div className="flex justify-end shrink-0 border-t pt-3">
          <Button
            type="button"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={handleConfirmMultiple}
          >
            Add {selectedIds.size} selected
          </Button>
        </div>
      ) : null}
    </div>
  );
}
