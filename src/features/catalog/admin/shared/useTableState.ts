import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ColumnDef,
  FilterDef,
  FilterValue,
  FiltersState,
  InlineEditSave,
  InlineEditState,
  PageSize,
  PAGE_SIZES,
  PersistedTableState,
  SortEntry,
} from "./types";

const PAGE_SIZE_VALUES: PageSize[] = [10, 20, 30, 50, 100];

// ── Persistence ───────────────────────────────────────────────────────────────

function loadState(id: string): Partial<PersistedTableState> {
  try {
    const raw = localStorage.getItem(`dt:${id}`);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedTableState>;
  } catch {
    return {};
  }
}

function saveState(id: string, state: PersistedTableState) {
  try {
    localStorage.setItem(`dt:${id}`, JSON.stringify(state));
  } catch {
    // Quota exceeded or SSR — ignore
  }
}

// ── Fuzzy search (lightweight, no Fuse.js dependency in shared hook) ──────────

function tokenize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

function matchesSearch<T>(row: T, term: string, fields: (keyof T)[]): boolean {
  if (!term) return true;
  const tokens = term.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = fields
    .map((f) => {
      const v = row[f];
      return typeof v === "string" ? tokenize(v) : String(v ?? "").toLowerCase();
    })
    .join(" ");
  return tokens.every((tok) => haystack.includes(tok));
}

// ── Default filter predicate ──────────────────────────────────────────────────

function defaultFilterPredicate<T>(row: T, def: FilterDef<T>, value: FilterValue): boolean {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0))
    return true;

  const fields = def.field
    ? Array.isArray(def.field)
      ? def.field
      : [def.field]
    : [def.key as keyof T];

  const getStr = (f: keyof T) => String(row[f] ?? "").toLowerCase();
  const getArr = (f: keyof T): string[] => {
    const v = row[f];
    if (Array.isArray(v)) return v.map(String);
    return typeof v === "string" ? [v] : [];
  };

  switch (def.type) {
    case "text": {
      const q = String(value).toLowerCase();
      return fields.some((f) => getStr(f).includes(q));
    }
    case "select": {
      const q = String(value).toLowerCase();
      return fields.some((f) => getStr(f) === q);
    }
    case "multi-select": {
      if (!Array.isArray(value) || value.length === 0) return true;
      const qs = (value as string[]).map((v) => v.toLowerCase());
      return fields.some((f) => {
        const fieldVals = getArr(f).map((v) => v.toLowerCase());
        return qs.some((q) => fieldVals.includes(q));
      });
    }
    case "boolean": {
      const boolVal = value === true || value === "true";
      return fields.some((f) => {
        const v = row[f];
        return Boolean(v) === boolVal;
      });
    }
    case "date-range": {
      if (!Array.isArray(value) || value.length !== 2) return true;
      const [from, to] = value as [string, string];
      return fields.some((f) => {
        const d = getStr(f);
        return (!from || d >= from) && (!to || d <= to + "z");
      });
    }
    default:
      return true;
  }
}

// ── Sort ──────────────────────────────────────────────────────────────────────

function applySort<T>(data: T[], sortEntries: SortEntry[], columns: ColumnDef<T>[]): T[] {
  if (sortEntries.length === 0) return data;
  const colMap = new Map(columns.map((c) => [c.key, c]));
  return [...data].sort((a, b) => {
    for (const { key, dir } of sortEntries) {
      const col = colMap.get(key);
      let cmp = 0;
      if (col?.sortFn) {
        cmp = col.sortFn(a, b);
      } else {
        const av = (a as Record<string, unknown>)[key];
        const bv = (b as Record<string, unknown>)[key];
        if (typeof av === "number" && typeof bv === "number") {
          cmp = av - bv;
        } else if (av instanceof Date && bv instanceof Date) {
          cmp = av.getTime() - bv.getTime();
        } else {
          cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" });
        }
      }
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export interface UseTableStateReturn<T> {
  // Processed data
  processedData: T[];
  pagedData: T[];
  totalRows: number;
  // Search
  search: string;
  setSearch: (v: string) => void;
  debouncedSearch: string;
  // Filters
  filters: FiltersState;
  setFilter: (key: string, value: FilterValue) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  // Sort
  sortEntries: SortEntry[];
  toggleSort: (key: string, multi: boolean) => void;
  // Pagination
  page: number;
  pageSize: PageSize;
  totalPages: number;
  setPage: (p: number) => void;
  setPageSize: (ps: PageSize) => void;
  // Column visibility + order
  visibleColumns: Record<string, boolean>;
  toggleColumn: (key: string) => void;
  columnOrder: string[];
  setColumnOrder: (order: string[]) => void;
  resetColumns: () => void;
  // Density
  density: "compact" | "normal" | "relaxed";
  setDensity: (d: "compact" | "normal" | "relaxed") => void;
  // Selection
  selectedKeys: Set<string>;
  toggleRow: (key: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  isPartialSelected: boolean;
  // Inline editing
  editState: InlineEditState | null;
  editValue: unknown;
  startEdit: (rowKey: string, colKey: string, currentValue: unknown) => void;
  setEditValue: (v: unknown) => void;
  commitEdit: () => InlineEditSave<T> | null;
  cancelEdit: () => void;
  dirtyKeys: Set<string>;
  // Dynamic filter options
  getFilterOptions: (def: FilterDef<T>) => { value: string; label: string }[];
}

export function useTableState<T>(
  id: string,
  data: T[],
  columns: ColumnDef<T>[],
  filterDefs: FilterDef<T>[],
  getRowKey: (row: T) => string,
  searchFields: (keyof T)[],
): UseTableStateReturn<T> {
  const saved = useMemo(() => loadState(id), [id]);

  // ── Default column visibility ─────────────────────────────────────────────
  const defaultVisible = useMemo(() => {
    const rec: Record<string, boolean> = {};
    for (const col of columns) {
      rec[col.key] = col.defaultVisible !== false;
    }
    return rec;
  }, [columns]);

  const defaultOrder = useMemo(() => columns.map((c) => c.key), [columns]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [search, setSearchRaw] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearch = useCallback((v: string) => {
    setSearchRaw(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(v.trim()), 100);
  }, []);

  const [filters, setFilters] = useState<FiltersState>(() => (saved.filters as FiltersState) ?? {});
  const [sortEntries, setSortEntries] = useState<SortEntry[]>(() => (saved.sortEntries as SortEntry[]) ?? []);
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState<PageSize>(() => {
    const ps = saved.pageSize;
    return ps && PAGE_SIZE_VALUES.includes(ps) ? ps : 20;
  });
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => ({
    ...defaultVisible,
    ...(saved.visibleColumns ?? {}),
  }));
  const [columnOrder, setColumnOrderRaw] = useState<string[]>(() => {
    const saved_order = saved.columnOrder;
    if (saved_order && Array.isArray(saved_order) && saved_order.length === columns.length) {
      return saved_order;
    }
    return defaultOrder;
  });
  const [density, setDensityRaw] = useState<"compact" | "normal" | "relaxed">(
    () => saved.density ?? "normal",
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [editState, setEditState] = useState<InlineEditState | null>(null);
  const [editValue, setEditValue] = useState<unknown>(undefined);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  // ── Persist state ─────────────────────────────────────────────────────────
  useEffect(() => {
    saveState(id, { sortEntries, filters, visibleColumns, columnOrder, pageSize, density });
  }, [id, sortEntries, filters, visibleColumns, columnOrder, pageSize, density]);

  // ── Filter + search + sort pipeline ──────────────────────────────────────
  const processedData = useMemo(() => {
    let result = data;

    // Apply filters
    for (const def of filterDefs) {
      const val = filters[def.key];
      if (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) continue;
      if (def.filter) {
        result = result.filter((row) => def.filter!(row, val));
      } else {
        result = result.filter((row) => defaultFilterPredicate(row, def, val));
      }
    }

    // Apply search — instant on raw input for responsive filtering
    const searchTerm = search.trim() || debouncedSearch;
    if (searchTerm) {
      result = result.filter((row) => matchesSearch(row, searchTerm, searchFields));
    }

    // Apply sort
    result = applySort(result, sortEntries, columns);

    return result;
  }, [data, filters, search, debouncedSearch, sortEntries, filterDefs, columns, searchFields]);

  const totalRows = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedData = useMemo(
    () => processedData.slice((safePage - 1) * pageSize, safePage * pageSize),
    [processedData, safePage, pageSize],
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageRaw(1);
  }, []);

  const clearFilters = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchRaw("");
    setDebouncedSearch("");
    setFilters({});
    setPageRaw(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = search.trim() ? 1 : 0;
    count += Object.values(filters).filter(
      (v) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
    ).length;
    return count;
  }, [search, filters]);

  const setPage = useCallback((p: number) => setPageRaw(Math.max(1, p)), []);

  const setPageSize = useCallback((ps: PageSize) => {
    setPageSizeRaw(ps);
    setPageRaw(1);
  }, []);

  const toggleSort = useCallback((key: string, multi: boolean) => {
    setSortEntries((prev) => {
      const existing = prev.find((e) => e.key === key);
      if (!multi) {
        if (!existing) return [{ key, dir: "asc" }];
        if (existing.dir === "asc") return [{ key, dir: "desc" }];
        return [];
      }
      if (!existing) return [...prev, { key, dir: "asc" }];
      if (existing.dir === "asc") return prev.map((e) => (e.key === key ? { ...e, dir: "desc" as const } : e));
      return prev.filter((e) => e.key !== key);
    });
    setPageRaw(1);
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setColumnOrder = useCallback((order: string[]) => setColumnOrderRaw(order), []);

  const resetColumns = useCallback(() => {
    setVisibleColumns(defaultVisible);
    setColumnOrderRaw(defaultOrder);
  }, [defaultVisible, defaultOrder]);

  const setDensity = useCallback((d: "compact" | "normal" | "relaxed") => setDensityRaw(d), []);

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleRow = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const allPagedKeys = useMemo(() => pagedData.map(getRowKey), [pagedData, getRowKey]);

  const isAllSelected = allPagedKeys.length > 0 && allPagedKeys.every((k) => selectedKeys.has(k));
  const isPartialSelected = !isAllSelected && allPagedKeys.some((k) => selectedKeys.has(k));

  const toggleAll = useCallback(() => {
    setSelectedKeys((prev) => {
      const keys = pagedData.map(getRowKey);
      if (keys.every((k) => prev.has(k))) {
        const next = new Set(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      }
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
  }, [pagedData, getRowKey]);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  // ── Inline editing ────────────────────────────────────────────────────────
  const startEdit = useCallback((rowKey: string, colKey: string, currentValue: unknown) => {
    setEditState({ rowKey, colKey });
    setEditValue(currentValue);
  }, []);

  const commitEdit = useCallback((): InlineEditSave<T> | null => {
    if (!editState) return null;
    const row = data.find((r) => getRowKey(r) === editState.rowKey);
    if (!row) { setEditState(null); return null; }
    const save: InlineEditSave<T> = { row, colKey: editState.colKey, newValue: editValue };
    setDirtyKeys((prev) => new Set([...prev, editState.rowKey]));
    setEditState(null);
    return save;
  }, [editState, editValue, data, getRowKey]);

  const cancelEdit = useCallback(() => {
    setEditState(null);
    setEditValue(undefined);
  }, []);

  // ── Dynamic filter options ─────────────────────────────────────────────────
  const getFilterOptions = useCallback(
    (def: FilterDef<T>) => {
      if (def.getOptions) return def.getOptions(data);
      if (def.options) return def.options;
      // Auto-derive unique values from data
      const seen = new Set<string>();
      const opts: { value: string; label: string }[] = [];
      for (const row of data) {
        const fields = def.field
          ? Array.isArray(def.field)
            ? def.field
            : [def.field]
          : [def.key as keyof T];
        for (const f of fields) {
          const v = row[f];
          const vals = Array.isArray(v) ? v.map(String) : [String(v ?? "")];
          for (const val of vals) {
            if (val && !seen.has(val)) {
              seen.add(val);
              opts.push({ value: val, label: val });
            }
          }
        }
      }
      return opts.sort((a, b) => a.label.localeCompare(b.label));
    },
    [data],
  );

  /**
   * Drop persisted filter selections that no longer match any row (stale localStorage after
   * data/import changes). Without this, hidden filters can hide every row while products exist.
   */
  useEffect(() => {
    if (data.length === 0 || filterDefs.length === 0) return;
    setFilters((prev) => {
      const next: FiltersState = { ...prev };
      let changed = false;
      for (const def of filterDefs) {
        const val = next[def.key];
        if (val === null || val === undefined || val === "") continue;
        if (Array.isArray(val) && val.length === 0) continue;

        if (def.type === "select") {
          const staticOpts = def.options;
          if (!staticOpts?.length) continue;
          const allowed = new Set(staticOpts.map((o) => String(o.value).toLowerCase()));
          if (!allowed.has(String(val).toLowerCase())) {
            delete next[def.key];
            changed = true;
          }
        } else if (def.type === "multi-select") {
          if (!Array.isArray(val)) continue;
          const dynOpts = getFilterOptions(def);
          const allowed = new Set(dynOpts.map((o) => String(o.value).toLowerCase()));
          const kept = val.filter((x) => allowed.has(String(x).toLowerCase()));
          if (kept.length !== val.length) {
            if (kept.length === 0) delete next[def.key];
            else next[def.key] = kept;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [data, filterDefs, getFilterOptions]);

  return {
    processedData,
    pagedData,
    totalRows,
    search,
    setSearch,
    debouncedSearch,
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
    sortEntries,
    toggleSort,
    page: safePage,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    visibleColumns,
    toggleColumn,
    columnOrder,
    setColumnOrder,
    resetColumns,
    density,
    setDensity,
    selectedKeys,
    toggleRow,
    toggleAll,
    clearSelection,
    isAllSelected,
    isPartialSelected,
    editState,
    editValue,
    startEdit,
    setEditValue,
    commitEdit,
    cancelEdit,
    dirtyKeys,
    getFilterOptions,
  };
}
