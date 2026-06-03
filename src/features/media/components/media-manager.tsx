"use client";

import { useCallback, useState, useTransition } from "react";
import type { MediaFolder, MediaType } from "@prisma/client";
import {
  bulkMoveMedia,
  deleteMediaAssets,
  fetchMediaAssets,
} from "@/features/media/actions";
import { MEDIA_TYPE_LABELS } from "@/features/media/constants";
import { formatBytes } from "@/features/media/media.service";
import { MediaFolderSidebar } from "./media-folder-sidebar";
import { MediaUploadPanel } from "./media-upload-panel";
import { MediaAssetCard, type MediaAssetRow } from "./media-asset-card";
import { MediaDetailPanel } from "./media-detail-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type FolderRow = MediaFolder & { _count: { assets: number; children: number } };

type StorageStat = {
  mediaType: MediaType;
  _sum: { sizeBytes: number | null };
  _count: { id: number };
};

type Props = {
  initialAssets: MediaAssetRow[];
  folders: FolderRow[];
  totalBytes: number;
  storageByType: StorageStat[];
};

const TYPE_TABS: (MediaType | "ALL")[] = ["ALL", "IMAGE", "VIDEO", "DOCUMENT", "SVG"];

export function MediaManager({
  initialAssets,
  folders: initialFolders,
  totalBytes,
  storageByType,
}: Props) {
  const [assets, setAssets] = useState(initialAssets);
  const [folders, setFolders] = useState(initialFolders);
  const [search, setSearch] = useState("");
  const [typeTab, setTypeTab] = useState<MediaType | "ALL">("ALL");
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<MediaType | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  const reloadAssets = useCallback(() => {
    startTransition(async () => {
      const rows = await fetchMediaAssets({
        search: search || undefined,
        folderId,
        mediaType: typeTab === "ALL" ? undefined : typeTab,
      });
      setAssets(rows as MediaAssetRow[]);
    });
  }, [search, folderId, typeTab]);

  const toggleSelect = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const selectAll = () => {
    setSelected(assets.map((a) => a.id));
  };

  const clearSelection = () => setSelected([]);

  const handleBulkDelete = () => {
    if (!selected.length) return;
    const used = assets.filter((a) => selected.includes(a.id) && a._count.usages > 0);
    const msg =
      used.length > 0
        ? `${used.length} selected file(s) are in use. Delete anyway?`
        : `Delete ${selected.length} file(s)?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      await deleteMediaAssets(selected);
      setAssets(assets.filter((a) => !selected.includes(a.id)));
      setSelected([]);
      if (detailId && selected.includes(detailId)) setDetailId(null);
    });
  };

  const handleBulkMove = (targetFolderId: string | null) => {
    if (!selected.length) return;
    startTransition(async () => {
      await bulkMoveMedia(selected, targetFolderId);
      reloadAssets();
      setSelected([]);
    });
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-2xl font-semibold">{formatBytes(totalBytes)}</p>
          <p className="text-xs text-muted-foreground">Total storage used</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {storageByType.map((row) => (
            <Badge key={row.mediaType} variant="outline" className="text-xs">
              {MEDIA_TYPE_LABELS[row.mediaType]}: {row._count.id} ·{" "}
              {formatBytes(row._sum.sizeBytes ?? 0)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <MediaFolderSidebar
          folders={folders}
          activeFolderId={folderId}
          onSelectFolder={(id) => {
            setFolderId(id);
            startTransition(async () => {
              const rows = await fetchMediaAssets({
                search: search || undefined,
                folderId: id,
                mediaType: typeTab === "ALL" ? undefined : typeTab,
              });
              setAssets(rows as MediaAssetRow[]);
            });
          }}
          onFoldersChange={() => window.location.reload()}
        />

        <div className="space-y-4 min-w-0">
          <div className="flex flex-wrap gap-2">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setTypeTab(tab);
                  const mt = tab === "ALL" ? undefined : tab;
                  if (tab !== "ALL") setUploadType(tab);
                  else setUploadType(undefined);
                  startTransition(async () => {
                    const rows = await fetchMediaAssets({
                      search: search || undefined,
                      folderId,
                      mediaType: mt,
                    });
                    setAssets(rows as MediaAssetRow[]);
                  });
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  typeTab === tab ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                )}
              >
                {tab === "ALL" ? "All" : MEDIA_TYPE_LABELS[tab]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search filename, alt, URL…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && reloadAssets()}
              className="max-w-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={reloadAssets} disabled={pending}>
              <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
            </Button>
          </div>

          <MediaUploadPanel
            uploadType={uploadType}
            folderId={folderId}
            onUploadComplete={() => reloadAssets()}
          />

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium">{selected.length} selected</span>
              <Button type="button" variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 me-1" />
                Delete
              </Button>
              <select
                className="border rounded-md h-8 px-2 text-xs"
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") return;
                  handleBulkMove(v === "__root__" ? null : v);
                  e.target.value = "";
                }}
              >
                <option value="">Move to folder…</option>
                <option value="__root__">Root</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{assets.length} items</span>
            <div className="flex gap-2">
              <button type="button" className="hover:text-foreground" onClick={selectAll}>
                Select all
              </button>
              <button type="button" className="hover:text-foreground" onClick={clearSelection}>
                Clear selection
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map((asset) => (
              <MediaAssetCard
                key={asset.id}
                asset={asset}
                selected={selected.includes(asset.id)}
                onSelect={() => toggleSelect(asset.id)}
                onOpen={() => setDetailId(asset.id)}
              />
            ))}
          </div>

          {!pending && assets.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12 border rounded-lg border-dashed">
              No files in this view. Upload above or change filters.
            </p>
          )}
        </div>
      </div>

      <MediaDetailPanel
        assetId={detailId}
        folders={folders}
        onClose={() => setDetailId(null)}
        onUpdated={reloadAssets}
      />

      {detailId && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20"
          aria-label="Close panel"
          onClick={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
