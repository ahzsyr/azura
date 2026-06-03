// @ts-nocheck — ported Astro media manager.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./MediaManagerApp.css";
import type {
  MediaItem, MediaListResponse, MediaType,
  MediaSortField, MediaSortDir, MediaUsage,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}

function mediaIcon(type: MediaType): string {
  switch (type) {
    case "image": return "🖼";
    case "svg": return "✦";
    case "video": return "▶";
    case "audio": return "♫";
    case "document": return "📄";
    case "zip": return "📦";
    default: return "📎";
  }
}

function isPreviewable(item: MediaItem): boolean {
  return item.type === "image" || item.type === "svg";
}

const TYPE_TABS: Array<{ value: MediaType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "svg", label: "SVG" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "Documents" },
  { value: "zip", label: "Archives" },
  { value: "other", label: "Other" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  pickerMode?: boolean;
  pickerAccept?: MediaType[];
  pickerMulti?: boolean;
  onPickerSelect?: (item: MediaItem) => void;
  onPickerSelectMultiple?: (items: MediaItem[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MediaManagerApp({
  pickerMode = false,
  pickerAccept,
  pickerMulti = false,
  onPickerSelect,
  onPickerSelectMultiple,
}: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(pickerMode ? 30 : 48);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<MediaType | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<MediaSortField>("date");
  const [sortDir, setSortDir] = useState<MediaSortDir>("desc");

  // View
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState<MediaItem | null>(null);

  // Detail sidebar
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [detailUsages, setDetailUsages] = useState<MediaUsage[] | null>(null);
  const [loadingUsages, setLoadingUsages] = useState(false);
  const [editMeta, setEditMeta] = useState<{ title: string; alt: string; description: string; tags: string } | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [renamingTo, setRenamingTo] = useState("");
  const [showRenameInput, setShowRenameInput] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Replace
  const [replacingItem, setReplacingItem] = useState<MediaItem | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Preview modal
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchMedia = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        search,
        sort,
        dir: sortDir,
        page: String(p),
        limit: String(pageSize),
      });
      const res = await fetch(`/api/catalog-media?${params}`);
      const data = await res.json() as MediaListResponse;
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load media");
      // Filter by accept in picker mode
      let filtered = data.items;
      if (pickerMode && pickerAccept && pickerAccept.length > 0) {
        filtered = filtered.filter((i) => pickerAccept.includes(i.type));
      }
      setItems(filtered);
      setTotal(data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search, sort, sortDir, pageSize, pickerMode, pickerAccept]);

  useEffect(() => { void fetchMedia(page); }, [fetchMedia, page]);

  useEffect(() => {
    setPage(1);
    void fetchMedia(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, search, sort, sortDir]);

  // ── Upload ────────────────────────────────────────────────────────────────

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    setUploadProgress([]);
    const msgs: string[] = [];

    for (const file of arr) {
      msgs.push(`Uploading ${file.name}…`);
      setUploadProgress([...msgs]);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/catalog-media/upload", { method: "POST", body: fd });
        const data = await res.json() as { item?: MediaItem; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        msgs[msgs.length - 1] = `✓ ${file.name}`;
      } catch (e: unknown) {
        msgs[msgs.length - 1] = `✗ ${file.name}: ${e instanceof Error ? e.message : "error"}`;
      }
      setUploadProgress([...msgs]);
    }
    setUploading(false);
    setTimeout(() => setUploadProgress([]), 3000);
    void fetchMedia(1);
    setPage(1);
  }, [fetchMedia]);

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDraggingOver(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((filename: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else {
        if (!pickerMulti && pickerMode) next.clear();
        next.add(filename);
      }
      return next;
    });
  }, [pickerMulti, pickerMode]);

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map((i) => i.filename)));
  }, [items]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ── Detail sidebar ────────────────────────────────────────────────────────

  const openDetail = useCallback(async (item: MediaItem) => {
    setDetailItem(item);
    setEditMeta({ title: item.title ?? "", alt: item.alt ?? "", description: item.description ?? "", tags: (item.tags ?? []).join(", ") });
    setDetailUsages(null);
    setShowRenameInput(false);
    setRenamingTo(item.filename);
    setLoadingUsages(true);
    try {
      const res = await fetch(`/api/catalog-media/relationships?filename=${encodeURIComponent(item.filename)}`);
      const data = await res.json() as { usages: MediaUsage[] };
      setDetailUsages(data.usages ?? []);
    } catch { setDetailUsages([]); }
    finally { setLoadingUsages(false); }
  }, []);

  const saveMetadata = useCallback(async () => {
    if (!detailItem || !editMeta) return;
    setSavingMeta(true);
    try {
      const body: Record<string, unknown> = {
        filename: detailItem.filename,
        title: editMeta.title,
        alt: editMeta.alt,
        description: editMeta.description,
        tags: editMeta.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (showRenameInput && renamingTo && renamingTo !== detailItem.filename) {
        body.newFilename = renamingTo;
      }
      const res = await fetch("/api/catalog-media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? "Save failed"); }
      const d = await res.json() as { filename?: string };
      if (d.filename && d.filename !== detailItem.filename) {
        setDetailItem(null);
      }
      void fetchMedia(page);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally { setSavingMeta(false); }
  }, [detailItem, editMeta, fetchMedia, page, showRenameInput, renamingTo]);

  const deleteItem = useCallback(async (item: MediaItem) => {
    if (!confirm(`Delete "${item.filename}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/catalog-media?filename=${encodeURIComponent(item.filename)}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? "Delete failed"); }
      setDetailItem(null);
      setSelected((prev) => { const n = new Set(prev); n.delete(item.filename); return n; });
      void fetchMedia(page);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed"); }
  }, [fetchMedia, page]);

  const bulkDelete = useCallback(async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} file(s)? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/catalog-media/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", filenames: Array.from(selected) }),
      });
      const d = await res.json() as { deleted: string[]; failed: string[] };
      if (d.failed?.length) alert(`Failed to delete: ${d.failed.join(", ")}`);
      setSelected(new Set());
      setDetailItem(null);
      void fetchMedia(page);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Bulk delete failed"); }
  }, [selected, fetchMedia, page]);

  // ── Replace ───────────────────────────────────────────────────────────────

  const startReplace = useCallback((item: MediaItem) => {
    setReplacingItem(item);
    setTimeout(() => replaceInputRef.current?.click(), 50);
  }, []);

  const handleReplaceFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingItem) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("filename", replacingItem.filename);
      const res = await fetch("/api/catalog-media/replace", { method: "POST", body: fd });
      const d = await res.json() as { newUrl?: string; error?: string; updatedProducts?: number; updatedPages?: number };
      if (!res.ok) throw new Error(d.error ?? "Replace failed");
      alert(`Replaced successfully. Updated ${d.updatedProducts ?? 0} product(s) and ${d.updatedPages ?? 0} page(s).`);
      void fetchMedia(page);
      setDetailItem(null);
    } catch (e2: unknown) { alert(e2 instanceof Error ? e2.message : "Replace failed"); }
    finally { setReplacingItem(null); if (replaceInputRef.current) replaceInputRef.current.value = ""; }
  }, [replacingItem, fetchMedia, page]);

  // ── Picker confirm ────────────────────────────────────────────────────────

  const handlePickerConfirm = useCallback(() => {
    if (!pickerMode) return;
    const selectedItems = items.filter((i) => selected.has(i.filename));
    if (pickerMulti && onPickerSelectMultiple) {
      onPickerSelectMultiple(selectedItems);
    } else if (selectedItems[0] && onPickerSelect) {
      onPickerSelect(selectedItems[0]);
    }
  }, [pickerMode, items, selected, pickerMulti, onPickerSelect, onPickerSelectMultiple]);

  // ── Render ────────────────────────────────────────────────────────────────

  const showDetail = !!detailItem && !pickerMode;

  return (
    <div
      className={`mm-root${pickerMode ? " mm-root--picker" : ""}`}
      ref={dropRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="mm-drop-overlay">
          <div className="mm-drop-overlay__inner">
            <span className="mm-drop-overlay__icon">⬆</span>
            <span>Drop files to upload</span>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
      />
      <input
        ref={replaceInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleReplaceFile}
      />

      {/* Toolbar */}
      <div className="mm-toolbar">
        <div className="mm-toolbar__left">
          {!pickerMode && (
            <button
              className="mm-btn mm-btn--primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "+ Upload"}
            </button>
          )}
          {pickerMode && (
            <button
              className="mm-btn mm-btn--primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload new"}
            </button>
          )}

          <div className="mm-search">
            <span className="mm-search__icon">⌕</span>
            <input
              className="mm-search__input"
              type="search"
              placeholder="Search media…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mm-toolbar__right">
          <select
            className="mm-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as MediaSortField)}
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="type">Type</option>
          </select>
          <button
            className="mm-btn mm-btn--icon"
            title={sortDir === "desc" ? "Descending" : "Ascending"}
            onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
          >
            {sortDir === "desc" ? "↓" : "↑"}
          </button>
          {!pickerMode && (
            <>
              <button
                className={`mm-btn mm-btn--icon${viewMode === "grid" ? " mm-btn--active" : ""}`}
                title="Grid view"
                onClick={() => setViewMode("grid")}
              >⊞</button>
              <button
                className={`mm-btn mm-btn--icon${viewMode === "list" ? " mm-btn--active" : ""}`}
                title="List view"
                onClick={() => setViewMode("list")}
              >☰</button>
            </>
          )}
        </div>
      </div>

      {/* Type tabs */}
      <div className="mm-tabs">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`mm-tab${typeFilter === tab.value ? " mm-tab--active" : ""}`}
            onClick={() => setTypeFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mm-bulk-bar">
          <span className="mm-bulk-bar__count">{selected.size} selected</span>
          {!pickerMode && (
            <button className="mm-btn mm-btn--danger mm-btn--sm" onClick={bulkDelete}>
              Delete selected
            </button>
          )}
          {pickerMode && (
            <button
              className="mm-btn mm-btn--primary mm-btn--sm"
              onClick={handlePickerConfirm}
              disabled={selected.size === 0}
            >
              {pickerMulti ? `Select ${selected.size} file(s)` : "Select"}
            </button>
          )}
          <button className="mm-btn mm-btn--ghost mm-btn--sm" onClick={clearSelection}>Clear</button>
          {!pickerMode && (
            <button className="mm-btn mm-btn--ghost mm-btn--sm" onClick={selectAll}>Select all</button>
          )}
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress.length > 0 && (
        <div className="mm-upload-progress">
          {uploadProgress.map((msg, i) => (
            <div key={i} className={`mm-upload-progress__item${msg.startsWith("✓") ? " ok" : msg.startsWith("✗") ? " err" : ""}`}>
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Main body */}
      <div className={`mm-body${showDetail ? " mm-body--with-detail" : ""}`}>
        {/* Media grid/list */}
        <div className="mm-media-area">
          {error && <div className="mm-error">⚠ {error}</div>}

          {loading ? (
            <div className="mm-loading">
              <div className="mm-spinner" />
              <span>Loading media…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="mm-empty">
              <div className="mm-empty__icon">📂</div>
              <div className="mm-empty__title">No media found</div>
              <div className="mm-empty__sub">
                {search ? "Try a different search term" : "Upload files to get started"}
              </div>
              {!pickerMode && (
                <button className="mm-btn mm-btn--primary" onClick={() => fileInputRef.current?.click()}>
                  Upload files
                </button>
              )}
            </div>
          ) : viewMode === "grid" || pickerMode ? (
            <div className="mm-grid">
              {items.map((item) => (
                <MediaCard
                  key={item.filename}
                  item={item}
                  selected={selected.has(item.filename)}
                  focused={focused?.filename === item.filename}
                  pickerMode={pickerMode}
                  onSelect={() => {
                    if (pickerMode && !pickerMulti) {
                      setSelected(new Set([item.filename]));
                      setFocused(item);
                    } else {
                      toggleSelect(item.filename);
                    }
                  }}
                  onDoubleClick={() => {
                    if (pickerMode && onPickerSelect) {
                      onPickerSelect(item);
                    } else {
                      setPreviewItem(item);
                    }
                  }}
                  onOpenDetail={() => openDetail(item)}
                  onDelete={() => void deleteItem(item)}
                  onPreview={() => setPreviewItem(item)}
                />
              ))}
            </div>
          ) : (
            <MediaList
              items={items}
              selected={selected}
              onToggleSelect={toggleSelect}
              onOpenDetail={openDetail}
              onDelete={deleteItem}
              onPreview={setPreviewItem}
              onReplace={startReplace}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mm-pagination">
              <button
                className="mm-btn mm-btn--ghost mm-btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >← Prev</button>
              <span className="mm-pagination__info">Page {page} / {totalPages} · {total} files</span>
              <button
                className="mm-btn mm-btn--ghost mm-btn--sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >Next →</button>
            </div>
          )}

          {total > 0 && totalPages <= 1 && (
            <div className="mm-pagination">
              <span className="mm-pagination__info">{total} file{total !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Detail sidebar */}
        {showDetail && detailItem && (
          <div className="mm-detail">
            <div className="mm-detail__header">
              <span className="mm-detail__title">File Details</span>
              <button className="mm-btn mm-btn--icon mm-btn--sm" onClick={() => setDetailItem(null)}>×</button>
            </div>

            {/* Preview */}
            <div className="mm-detail__preview">
              {isPreviewable(detailItem) ? (
                <img src={detailItem.url} alt={detailItem.alt ?? detailItem.filename} className="mm-detail__img" />
              ) : (
                <div className="mm-detail__icon-preview">
                  <span>{mediaIcon(detailItem.type)}</span>
                  <span>{detailItem.ext}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mm-detail__info">
              <div className="mm-detail__row">
                <span className="mm-detail__label">File</span>
                <span className="mm-detail__val mm-detail__val--mono">{detailItem.filename}</span>
              </div>
              <div className="mm-detail__row">
                <span className="mm-detail__label">Type</span>
                <span className="mm-detail__val">{detailItem.type} · {detailItem.ext}</span>
              </div>
              <div className="mm-detail__row">
                <span className="mm-detail__label">Size</span>
                <span className="mm-detail__val">{formatBytes(detailItem.size)}</span>
              </div>
              <div className="mm-detail__row">
                <span className="mm-detail__label">Uploaded</span>
                <span className="mm-detail__val">{formatDate(detailItem.uploadedAt)}</span>
              </div>
              <div className="mm-detail__row">
                <span className="mm-detail__label">URL</span>
                <a className="mm-detail__val mm-detail__link" href={detailItem.url} target="_blank" rel="noopener">{detailItem.url}</a>
              </div>
            </div>

            {/* Editable metadata */}
            {editMeta && (
              <div className="mm-detail__edit">
                <div className="mm-detail__edit-group">
                  <label className="mm-detail__edit-label">Title</label>
                  <input
                    className="mm-detail__edit-input"
                    value={editMeta.title}
                    placeholder="Display title"
                    onChange={(e) => setEditMeta({ ...editMeta, title: e.target.value })}
                  />
                </div>
                <div className="mm-detail__edit-group">
                  <label className="mm-detail__edit-label">Alt text</label>
                  <input
                    className="mm-detail__edit-input"
                    value={editMeta.alt}
                    placeholder="Alt text for images"
                    onChange={(e) => setEditMeta({ ...editMeta, alt: e.target.value })}
                  />
                </div>
                <div className="mm-detail__edit-group">
                  <label className="mm-detail__edit-label">Description</label>
                  <textarea
                    className="mm-detail__edit-input mm-detail__edit-textarea"
                    value={editMeta.description}
                    placeholder="Optional description"
                    rows={2}
                    onChange={(e) => setEditMeta({ ...editMeta, description: e.target.value })}
                  />
                </div>
                <div className="mm-detail__edit-group">
                  <label className="mm-detail__edit-label">Tags (comma-separated)</label>
                  <input
                    className="mm-detail__edit-input"
                    value={editMeta.tags}
                    placeholder="tag1, tag2"
                    onChange={(e) => setEditMeta({ ...editMeta, tags: e.target.value })}
                  />
                </div>
                {showRenameInput && (
                  <div className="mm-detail__edit-group">
                    <label className="mm-detail__edit-label">Rename to</label>
                    <input
                      className="mm-detail__edit-input"
                      value={renamingTo}
                      onChange={(e) => setRenamingTo(e.target.value)}
                    />
                  </div>
                )}
                <div className="mm-detail__edit-actions">
                  <button className="mm-btn mm-btn--primary mm-btn--sm" onClick={saveMetadata} disabled={savingMeta}>
                    {savingMeta ? "Saving…" : "Save"}
                  </button>
                  <button
                    className="mm-btn mm-btn--ghost mm-btn--sm"
                    onClick={() => setShowRenameInput((v) => !v)}
                  >
                    {showRenameInput ? "Cancel rename" : "Rename"}
                  </button>
                </div>
              </div>
            )}

            {/* Usages */}
            <div className="mm-detail__usages">
              <div className="mm-detail__usages-title">Used in</div>
              {loadingUsages ? (
                <div className="mm-detail__usages-loading">Scanning…</div>
              ) : detailUsages && detailUsages.length > 0 ? (
                <ul className="mm-detail__usages-list">
                  {detailUsages.map((u, i) => (
                    <li key={i} className="mm-detail__usage-item">
                      <span className="mm-detail__usage-type">{u.type}</span>
                      {u.url ? (
                        <a href={u.url} target="_blank" rel="noopener" className="mm-detail__usage-label">{u.label ?? u.id}</a>
                      ) : (
                        <span className="mm-detail__usage-label">{u.label ?? u.id}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mm-detail__usages-empty">Not used anywhere</div>
              )}
            </div>

            {/* Actions */}
            <div className="mm-detail__actions">
              <button
                className="mm-btn mm-btn--ghost mm-btn--sm"
                onClick={() => {
                  navigator.clipboard.writeText(detailItem.url).catch(() => {});
                }}
              >
                Copy URL
              </button>
              <button className="mm-btn mm-btn--ghost mm-btn--sm" onClick={() => startReplace(detailItem)}>
                Replace
              </button>
              <button className="mm-btn mm-btn--danger mm-btn--sm" onClick={() => void deleteItem(detailItem)}>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewItem && (
        <div className="mm-preview-modal" onClick={() => setPreviewItem(null)}>
          <div className="mm-preview-modal__inner" onClick={(e) => e.stopPropagation()}>
            <button className="mm-preview-modal__close" onClick={() => setPreviewItem(null)}>×</button>
            {isPreviewable(previewItem) ? (
              <img src={previewItem.url} alt={previewItem.alt ?? previewItem.filename} className="mm-preview-modal__img" />
            ) : previewItem.type === "video" ? (
              <video src={previewItem.url} controls className="mm-preview-modal__video" />
            ) : previewItem.type === "audio" ? (
              <audio src={previewItem.url} controls className="mm-preview-modal__audio" />
            ) : (
              <div className="mm-preview-modal__fallback">
                <span>{mediaIcon(previewItem.type)}</span>
                <span>{previewItem.filename}</span>
                <a href={previewItem.url} target="_blank" rel="noopener" className="mm-btn mm-btn--primary">Open file ↗</a>
              </div>
            )}
            <div className="mm-preview-modal__meta">
              <span>{previewItem.originalName}</span>
              <span>{formatBytes(previewItem.size)}</span>
              <button
                className="mm-btn mm-btn--ghost mm-btn--sm"
                onClick={() => navigator.clipboard.writeText(previewItem.url).catch(() => {})}
              >Copy URL</button>
              {!pickerMode && (
                <button className="mm-btn mm-btn--primary mm-btn--sm" onClick={() => {
                  setPreviewItem(null);
                  void openDetail(previewItem);
                }}>Details</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MediaCard ─────────────────────────────────────────────────────────────────

function MediaCard({
  item, selected, focused, pickerMode, onSelect, onDoubleClick, onOpenDetail, onDelete, onPreview,
}: {
  item: MediaItem;
  selected: boolean;
  focused: boolean;
  pickerMode: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onOpenDetail: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={`mm-card${selected ? " mm-card--selected" : ""}${focused ? " mm-card--focused" : ""}`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      title={item.originalName}
    >
      <div className="mm-card__preview">
        {isPreviewable(item) ? (
          <img src={item.url} alt={item.alt ?? item.filename} className="mm-card__img" loading="lazy" />
        ) : (
          <div className="mm-card__icon">
            <span className="mm-card__icon-sym">{mediaIcon(item.type)}</span>
            <span className="mm-card__ext">{item.ext}</span>
          </div>
        )}
        <div className="mm-card__overlay">
          {!pickerMode && (
            <>
              <button
                type="button"
                className="mm-card__action"
                title="Preview"
                onClick={(e) => { e.stopPropagation(); onPreview(); }}
              >⤢</button>
              <button
                type="button"
                className="mm-card__action"
                title="Details"
                onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
              >✏</button>
              <button
                type="button"
                className="mm-card__action mm-card__action--danger"
                title="Delete"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >×</button>
            </>
          )}
        </div>
        {selected && <div className="mm-card__check">✓</div>}
      </div>
      <div className="mm-card__name">{item.title ?? item.originalName}</div>
      <div className="mm-card__meta">{formatBytes(item.size)}</div>
    </div>
  );
}

// ── MediaList ─────────────────────────────────────────────────────────────────

function MediaList({
  items, selected, onToggleSelect, onOpenDetail, onDelete, onPreview, onReplace,
}: {
  items: MediaItem[];
  selected: Set<string>;
  onToggleSelect: (f: string) => void;
  onOpenDetail: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
  onPreview: (item: MediaItem) => void;
  onReplace: (item: MediaItem) => void;
}) {
  return (
    <table className="mm-list">
      <thead>
        <tr>
          <th className="mm-list__th mm-list__th--check"></th>
          <th className="mm-list__th">Preview</th>
          <th className="mm-list__th">Name</th>
          <th className="mm-list__th">Type</th>
          <th className="mm-list__th">Size</th>
          <th className="mm-list__th">Uploaded</th>
          <th className="mm-list__th">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.filename} className={`mm-list__row${selected.has(item.filename) ? " mm-list__row--selected" : ""}`}>
            <td className="mm-list__td mm-list__td--check">
              <input
                type="checkbox"
                checked={selected.has(item.filename)}
                onChange={() => onToggleSelect(item.filename)}
              />
            </td>
            <td className="mm-list__td mm-list__td--preview">
              {isPreviewable(item) ? (
                <img src={item.url} alt="" className="mm-list__thumb" />
              ) : (
                <span className="mm-list__type-icon">{mediaIcon(item.type)}</span>
              )}
            </td>
            <td className="mm-list__td">
              <div className="mm-list__name">{item.title ?? item.originalName}</div>
              <div className="mm-list__filename">{item.filename}</div>
            </td>
            <td className="mm-list__td">{item.type} · {item.ext}</td>
            <td className="mm-list__td mm-list__td--mono">{formatBytes(item.size)}</td>
            <td className="mm-list__td mm-list__td--mono">{formatDate(item.uploadedAt)}</td>
            <td className="mm-list__td">
              <span className="mm-list__actions">
                <button className="mm-btn mm-btn--icon mm-btn--sm" title="Preview" onClick={() => onPreview(item)}>⤢</button>
                <button className="mm-btn mm-btn--icon mm-btn--sm" title="Details" onClick={() => onOpenDetail(item)}>✏</button>
                <button className="mm-btn mm-btn--icon mm-btn--sm" title="Replace" onClick={() => onReplace(item)}>⇄</button>
                <button className="mm-btn mm-btn--icon mm-btn--sm mm-btn--danger" title="Delete" onClick={() => void onDelete(item)}>×</button>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
