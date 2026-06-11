import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import "./DataTable.css";
import type {
  BulkAction,
  ColumnDef,
  DataTableProps,
  FilterDef,
  FilterValue,
  InlineEditSave,
  PageSize,
} from "./types";
import { PAGE_SIZES } from "./types";
import { useTableState } from "./useTableState";

// ── Toast system ──────────────────────────────────────────────────────────────

interface Toast { id: number; message: string; type: "success" | "error" | "info"; }

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="dt-toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`dt-toast dt-toast--${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}

let toastIdSeq = 0;

/** Stable skeleton width for SSR/hydration (never use Math.random() in render). */
function skeletonWidthPercent(rowIndex: number, colKey: string): string {
  let hash = rowIndex * 31;
  for (let i = 0; i < colKey.length; i++) {
    hash = (hash * 31 + colKey.charCodeAt(i)) | 0;
  }
  return `${40 + (Math.abs(hash) % 40)}%`;
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++toastIdSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);
  return { toasts, push };
}

// ── Multi-select filter dropdown ──────────────────────────────────────────────

function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = localSearch
    ? options.filter((o) => o.label.toLowerCase().includes(localSearch.toLowerCase()))
    : options;

  const displayLabel = value.length === 0 ? label : `${label} (${value.length})`;

  return (
    <div className="dt-multi-select" ref={ref}>
      <div
        className={`dt-multi-select-trigger${open ? " dt-multi-select-trigger--open" : ""}`}
        onClick={() => setOpen((p) => !p)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
      >
        <span>{displayLabel}</span>
        <span style={{ fontSize: 9, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="dt-multi-select-dropdown">
          <input
            className="dt-multi-select-search"
            placeholder="Search…"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            autoFocus
          />
          {filtered.map((opt) => (
            <label key={opt.value} className="dt-multi-select-option">
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={(e) => {
                  if (e.target.checked) onChange([...value, opt.value]);
                  else onChange(value.filter((v) => v !== opt.value));
                }}
              />
              {opt.label}
            </label>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "6px 10px", color: "#9ca3af", fontSize: 12 }}>No results</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar<T>({
  filterDefs,
  filters,
  onSetFilter,
  onClearFilters,
  activeFilterCount,
  getOptions,
}: {
  filterDefs: FilterDef<T>[];
  filters: Record<string, FilterValue>;
  onSetFilter: (k: string, v: FilterValue) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  getOptions: (def: FilterDef<T>) => { value: string; label: string }[];
}) {
  return (
    <>
      <div className="dt-filter-bar">
        {filterDefs.map((def) => {
          const val = filters[def.key];
          const opts = getOptions(def);

          return (
            <div key={def.key} className="dt-filter-group">
              <span className="dt-filter-label">{def.label}</span>
              {(def.type === "text") && (
                <input
                  className="dt-filter-input"
                  type="text"
                  placeholder={def.placeholder ?? `Filter ${def.label}…`}
                  value={(val as string) ?? ""}
                  onChange={(e) => onSetFilter(def.key, e.target.value || null)}
                />
              )}
              {def.type === "select" && (
                <select
                  className="dt-filter-select"
                  value={(val as string) ?? ""}
                  onChange={(e) => onSetFilter(def.key, e.target.value || null)}
                >
                  <option value="">All</option>
                  {opts.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
              {def.type === "multi-select" && (
                <MultiSelectFilter
                  label={def.label}
                  options={opts}
                  value={(val as string[]) ?? []}
                  onChange={(v) => onSetFilter(def.key, v.length ? v : null)}
                />
              )}
              {def.type === "boolean" && (
                <select
                  className="dt-filter-select"
                  value={val === null || val === undefined ? "" : String(val)}
                  onChange={(e) =>
                    onSetFilter(def.key, e.target.value === "" ? null : e.target.value === "true")
                  }
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              )}
              {def.type === "date-range" && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    className="dt-filter-input"
                    type="date"
                    style={{ minWidth: 120 }}
                    value={((val as [string, string])?.[0]) ?? ""}
                    onChange={(e) => {
                      const cur = (val as [string, string]) ?? ["", ""];
                      onSetFilter(def.key, [e.target.value, cur[1]] as [string, string]);
                    }}
                  />
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>–</span>
                  <input
                    className="dt-filter-input"
                    type="date"
                    style={{ minWidth: 120 }}
                    value={((val as [string, string])?.[1]) ?? ""}
                    onChange={(e) => {
                      const cur = (val as [string, string]) ?? ["", ""];
                      onSetFilter(def.key, [cur[0], e.target.value] as [string, string]);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {activeFilterCount > 0 && (
          <button className="dt-btn dt-btn--ghost" style={{ alignSelf: "flex-end" }} onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="dt-active-filters">
          <span style={{ fontSize: 11, color: "#6b7280", marginRight: 4 }}>Active filters:</span>
          {filterDefs.map((def) => {
            const val = filters[def.key];
            if (!val || (Array.isArray(val) && val.length === 0)) return null;
            const displayVal = Array.isArray(val) ? val.join(", ") : String(val);
            return (
              <span key={def.key} className="dt-filter-badge">
                <strong>{def.label}:</strong> {displayVal.length > 24 ? displayVal.slice(0, 24) + "…" : displayVal}
                <button
                  className="dt-filter-badge-remove"
                  onClick={() => onSetFilter(def.key, null)}
                  aria-label={`Remove ${def.label} filter`}
                >
                  ×
                </button>
              </span>
            );
          })}
          <button className="dt-filter-clear-all" onClick={onClearFilters}>Clear all</button>
        </div>
      )}
    </>
  );
}

// ── Column manager dropdown ───────────────────────────────────────────────────

function ColumnManager<T>({
  columns,
  visibleColumns,
  columnOrder,
  onToggle,
  onReorder,
  onReset,
}: {
  columns: ColumnDef<T>[];
  visibleColumns: Record<string, boolean>;
  columnOrder: string[];
  onToggle: (k: string) => void;
  onReorder: (order: string[]) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const orderedCols = useMemo(() => {
    const map = new Map(columns.map((c) => [c.key, c]));
    return columnOrder.map((k) => map.get(k)).filter(Boolean) as ColumnDef<T>[];
  }, [columns, columnOrder]);

  const handleDragStart = (key: string) => setDragging(key);
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (!dragging || dragging === key) return;
    const newOrder = [...columnOrder];
    const from = newOrder.indexOf(dragging);
    const to = newOrder.indexOf(key);
    if (from < 0 || to < 0) return;
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragging);
    onReorder(newOrder);
  };
  const handleDragEnd = () => setDragging(null);

  return (
    <div className="dt-colmgr-wrap" ref={ref}>
      <button className="dt-btn" onClick={() => setOpen((p) => !p)} title="Columns">
        ⊞ Columns
      </button>
      {open && (
        <div className="dt-colmgr-dropdown">
          <div className="dt-colmgr-header">
            <span className="dt-colmgr-title">Columns</span>
            <button className="dt-btn dt-btn--xs dt-btn--ghost" onClick={onReset}>Reset</button>
          </div>
          {orderedCols
            .filter((c) => c.hideable !== false)
            .map((col) => (
              <div
                key={col.key}
                className={`dt-colmgr-item${dragging === col.key ? " dt-colmgr-item--dragging" : ""}`}
                draggable
                onDragStart={() => handleDragStart(col.key)}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragEnd={handleDragEnd}
              >
                <input
                  type="checkbox"
                  checked={visibleColumns[col.key] !== false}
                  onChange={() => onToggle(col.key)}
                  id={`col-${col.key}`}
                />
                <label htmlFor={`col-${col.key}`} style={{ cursor: "pointer", flex: 1, fontSize: 12.5 }}>
                  {col.label}
                </label>
                <span style={{ color: "#9ca3af", fontSize: 11, cursor: "grab" }}>⠿</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  pageSize,
  totalRows,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  pageSize: PageSize;
  totalRows: number;
  onPage: (p: number) => void;
  onPageSize: (ps: PageSize) => void;
}) {
  const pages = useMemo(() => {
    const result: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      if (page > 3) result.push("…");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) result.push(i);
      if (page < totalPages - 2) result.push("…");
      result.push(totalPages);
    }
    return result;
  }, [page, totalPages]);

  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalRows);

  return (
    <div className="dt-pagination">
      <span className="dt-page-info">
        <strong>{startRow}–{endRow}</strong> of <strong>{totalRows}</strong>
      </span>
      <button className="dt-page-btn dt-page-btn--nav" onClick={() => onPage(1)} disabled={page === 1} title="First">«</button>
      <button className="dt-page-btn dt-page-btn--nav" onClick={() => onPage(page - 1)} disabled={page === 1} title="Previous">‹</button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="dt-page-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`dt-page-btn${page === p ? " dt-page-btn--active" : ""}`}
            onClick={() => onPage(p as number)}
          >
            {p}
          </button>
        )
      )}
      <button className="dt-page-btn dt-page-btn--nav" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next">›</button>
      <button className="dt-page-btn dt-page-btn--nav" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last">»</button>

      <span className="dt-page-size-label">
        Rows:
        <select
          className="dt-pagesize-select"
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value) as PageSize)}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </span>
    </div>
  );
}

// ── Inline cell ───────────────────────────────────────────────────────────────

function InlineCell<T>({
  col,
  row,
  isEditing,
  editValue,
  onStartEdit,
  onChangeValue,
  onCommit,
  onCancel,
}: {
  col: ColumnDef<T>;
  row: T;
  isEditing: boolean;
  editValue: unknown;
  onStartEdit: () => void;
  onChangeValue: (v: unknown) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (isEditing) (inputRef.current as HTMLElement | null)?.focus();
  }, [isEditing]);

  const handleKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  if (isEditing && col.renderEdit) {
    return (
      <div className="dt-cell-edit" onKeyDownCapture={handleKey}>
        {col.renderEdit(row, editValue, onChangeValue)}
      </div>
    );
  }

  if (isEditing) {
    const strVal = String(editValue ?? "");
    return (
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        className="dt-inline-input"
        value={strVal}
        onChange={(e) => onChangeValue(e.target.value)}
        onKeyDown={handleKey}
        onBlur={onCommit}
      />
    );
  }

  const editable = Boolean(col.renderEdit !== undefined || col.key);
  return (
    <div
      className={`dt-cell-display${col.renderEdit ? " dt-td--editable" : ""}`}
      onClick={col.renderEdit ? onStartEdit : undefined}
      title={col.renderEdit ? "Click to edit" : undefined}
      style={{ cursor: col.renderEdit ? "text" : "default" }}
    >
      {col.render(row, {
        rowIndex: 0,
        isSelected: false,
        isDirty: false,
        startEdit: () => {},
      })}
      {col.renderEdit && (
        <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4, opacity: 0.6 }}>✎</span>
      )}
    </div>
  );
}

// ── Main DataTable ────────────────────────────────────────────────────────────

export function DataTable<T>({
  id,
  data,
  columns,
  filters: filterDefs = [],
  bulkActions = [],
  getRowKey,
  onInlineEdit,
  onBulkDelete,
  toolbarLeft,
  toolbarRight,
  loading = false,
  emptyMessage = "No data found.",
  searchFields,
  horizontalScroll = true,
  stickyHeaderTop = 0,
  onRowClick,
  rowClassName,
  noVirtualize = false,
}: DataTableProps<T>) {
  const { toasts, push: pushToast } = useToasts();

  // Default search fields: all column keys
  const resolvedSearchFields = useMemo<(keyof T)[]>(() => {
    if (searchFields) return searchFields;
    return columns.map((c) => c.key as keyof T);
  }, [searchFields, columns]);

  const ts = useTableState(id, data, columns, filterDefs, getRowKey, resolvedSearchFields);
  const [showFilters, setShowFilters] = useState(filterDefs.length > 0);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Ordered visible columns
  const visibleCols = useMemo(() => {
    const map = new Map(columns.map((c) => [c.key, c]));
    return ts.columnOrder
      .map((k) => map.get(k))
      .filter((c): c is ColumnDef<T> => !!c && ts.visibleColumns[c.key] !== false);
  }, [columns, ts.columnOrder, ts.visibleColumns]);

  // Selected rows
  const selectedRows = useMemo(
    () => ts.pagedData.filter((r) => ts.selectedKeys.has(getRowKey(r))),
    [ts.pagedData, ts.selectedKeys, getRowKey],
  );

  // ── Inline edit commit ────────────────────────────────────────────────────
  const handleCommit = useCallback(async () => {
    const save = ts.commitEdit();
    if (!save || !onInlineEdit) return;
    const key = getRowKey(save.row);
    setSavingKey(key);
    try {
      await onInlineEdit(save as InlineEditSave<T>);
      pushToast("Saved", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSavingKey(null);
    }
  }, [ts, onInlineEdit, getRowKey, pushToast]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && document.activeElement?.closest(".dt-table-wrap")) {
        e.preventDefault();
        ts.toggleAll();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [ts]);

  // ── Bulk action handler ───────────────────────────────────────────────────
  const runBulkAction = useCallback(
    async (action: BulkAction<T>) => {
      try {
        await action.handler(selectedRows, ts.clearSelection);
        pushToast(`${action.label} complete`, "success");
      } catch (e) {
        pushToast(e instanceof Error ? e.message : `${action.label} failed`, "error");
      }
    },
    [selectedRows, ts.clearSelection, pushToast],
  );

  // ── Sort icon ─────────────────────────────────────────────────────────────
  const sortIcon = (key: string) => {
    const entry = ts.sortEntries.find((e) => e.key === key);
    if (!entry) return <span className="dt-sort-icon">↕</span>;
    const rank = ts.sortEntries.indexOf(entry) + 1;
    return (
      <>
        <span className="dt-sort-icon dt-sort-icon--active">{entry.dir === "asc" ? "↑" : "↓"}</span>
        {ts.sortEntries.length > 1 && <span className="dt-sort-rank">{rank}</span>}
      </>
    );
  };

  const densityClass = `dt-root--${ts.density}`;

  return (
    <div className={`dt-root ${densityClass}`}>
      {/* Toolbar */}
      <div className="dt-toolbar">
        <div className="dt-toolbar-left">
          <div className="dt-search-wrap">
            <input
              className="dt-search"
              type="search"
              placeholder="Search…"
              value={ts.search}
              onChange={(e) => ts.setSearch(e.target.value)}
              aria-label="Search table"
            />
          </div>
          {filterDefs.length > 0 && (
            <button
              className={`dt-btn${showFilters ? " dt-btn--secondary" : ""}`}
              onClick={() => setShowFilters((p) => !p)}
            >
              ⊟ Filters{ts.activeFilterCount > 0 ? ` (${ts.activeFilterCount})` : ""}
            </button>
          )}
          {toolbarLeft}
        </div>
        <div className="dt-toolbar-right">
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {ts.totalRows} row{ts.totalRows !== 1 ? "s" : ""}
          </span>
          <select
            className="dt-density-select"
            value={ts.density}
            onChange={(e) => ts.setDensity(e.target.value as "compact" | "normal" | "relaxed")}
            title="Table density"
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxed</option>
          </select>
          {columns.some((c) => c.hideable !== false) && (
            <ColumnManager
              columns={columns}
              visibleColumns={ts.visibleColumns}
              columnOrder={ts.columnOrder}
              onToggle={ts.toggleColumn}
              onReorder={ts.setColumnOrder}
              onReset={ts.resetColumns}
            />
          )}
          {toolbarRight}
        </div>
      </div>

      {/* Filters */}
      {showFilters && filterDefs.length > 0 && (
        <FilterBar
          filterDefs={filterDefs}
          filters={ts.filters}
          onSetFilter={ts.setFilter}
          onClearFilters={ts.clearFilters}
          activeFilterCount={ts.activeFilterCount}
          getOptions={ts.getFilterOptions}
        />
      )}

      {/* Bulk actions bar */}
      {ts.selectedKeys.size > 0 && (
        <div className="dt-bulk-bar">
          <span className="dt-bulk-count">{ts.selectedKeys.size} selected</span>
          <div className="dt-bulk-divider" />
          {bulkActions.map((action) => (
            <button
              key={action.key}
              className={`dt-btn dt-btn--${action.variant ?? "secondary"}`}
              disabled={action.disabled?.(selectedRows)}
              onClick={() => void runBulkAction(action)}
            >
              {action.label}
            </button>
          ))}
          {onBulkDelete && (
            <button
              className="dt-btn dt-btn--danger"
              onClick={async () => {
                if (!confirm(`Delete ${ts.selectedKeys.size} item(s)?`)) return;
                try {
                  await onBulkDelete(selectedRows);
                  ts.clearSelection();
                  pushToast(`Deleted ${ts.selectedKeys.size} item(s)`, "success");
                } catch (e) {
                  pushToast(e instanceof Error ? e.message : "Delete failed", "error");
                }
              }}
            >
              Delete selected
            </button>
          )}
          <button className="dt-btn dt-btn--ghost" onClick={ts.clearSelection} style={{ marginLeft: "auto" }}>
            Deselect all
          </button>
        </div>
      )}

      {/* Table */}
      <div className="dt-table-wrap" style={{ overflowX: horizontalScroll ? "auto" : "hidden" }}>
        <table className="dt-table" role="grid">
          <thead className="dt-thead" style={{ top: stickyHeaderTop }}>
            <tr>
              {/* Checkbox header */}
              <th className="dt-th dt-th-check">
                <input
                  type="checkbox"
                  checked={ts.isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = ts.isPartialSelected; }}
                  onChange={ts.toggleAll}
                  aria-label="Select all"
                />
              </th>
              {visibleCols.map((col) => {
                const isSorted = ts.sortEntries.some((e) => e.key === col.key);
                return (
                  <th
                    key={col.key}
                    className={[
                      "dt-th",
                      col.sortable !== false ? "dt-th--sortable" : "",
                      isSorted ? "dt-th--sorted" : "",
                      col.pinned ? "dt-th--pinned" : "",
                      col.className ?? "",
                    ].join(" ")}
                    style={{ width: col.width, textAlign: col.align ?? "left" }}
                  >
                    <div
                      className="dt-th-inner"
                      onClick={
                        col.sortable !== false
                          ? (e) => ts.toggleSort(col.key, e.shiftKey)
                          : undefined
                      }
                      title={col.sortable !== false ? "Click to sort, Shift+click for multi-sort" : undefined}
                    >
                      {col.label}
                      {col.sortable !== false && sortIcon(col.key)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, ri) => (
                <tr key={ri} className="dt-tr">
                  <td className="dt-td dt-td-check">
                    <span
                      className="dt-skeleton"
                      style={{ width: "14px", height: "14px", display: "block" }}
                    />
                  </td>
                  {visibleCols.map((col) => (
                    <td key={col.key} className="dt-td">
                      <span
                        className="dt-skeleton"
                        style={{
                          width: skeletonWidthPercent(ri, col.key),
                          height: "14px",
                          display: "inline-block",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : ts.pagedData.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length + 1} className="dt-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              ts.pagedData.map((row, ri) => {
                const key = getRowKey(row);
                const isSelected = ts.selectedKeys.has(key);
                const isDirty = ts.dirtyKeys.has(key);
                const isSaving = savingKey === key;

                return (
                  <tr
                    key={key}
                    className={[
                      "dt-tr",
                      isSelected ? "dt-tr--selected" : "",
                      isDirty ? "dt-tr--dirty" : "",
                      onRowClick ? "dt-tr--clickable" : "",
                      rowClassName?.(row) ?? "",
                    ].join(" ")}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button, input, select, a")) return;
                      onRowClick?.(row);
                    }}
                    style={{ opacity: isSaving ? 0.6 : 1 }}
                  >
                    {/* Checkbox */}
                    <td className="dt-td dt-td-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => ts.toggleRow(key)}
                        aria-label={`Select row ${key}`}
                      />
                    </td>
                    {visibleCols.map((col) => {
                      const isEditing =
                        ts.editState?.rowKey === key && ts.editState?.colKey === col.key;
                      const rawVal = (row as Record<string, unknown>)[col.key];

                      return (
                        <td
                          key={col.key}
                          className={[
                            "dt-td",
                            col.renderEdit ? "dt-td--editable" : "",
                            isEditing ? "dt-td--editing" : "",
                            col.pinned ? "dt-td--pinned" : "",
                            col.className ?? "",
                          ].join(" ")}
                          style={{ textAlign: col.align ?? "left" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <InlineCell
                            col={col}
                            row={row}
                            isEditing={isEditing}
                            editValue={ts.editValue}
                            onStartEdit={() => ts.startEdit(key, col.key, rawVal)}
                            onChangeValue={ts.setEditValue}
                            onCommit={() => void handleCommit()}
                            onCancel={ts.cancelEdit}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && (
        <Pagination
          page={ts.page}
          totalPages={ts.totalPages}
          pageSize={ts.pageSize}
          totalRows={ts.totalRows}
          onPage={ts.setPage}
          onPageSize={ts.setPageSize}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default DataTable;
