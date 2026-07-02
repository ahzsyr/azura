import type { ReactNode } from "react";

// ── Column definition ─────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  key: string;
  label: string;
  /** Render display content for a cell. */
  render: (row: T, ctx: CellContext<T>) => ReactNode;
  /** If provided, clicking the cell opens an inline editor. */
  renderEdit?: (row: T, value: unknown, onChange: (v: unknown) => void) => ReactNode;
  /** Custom sort comparator. Falls back to string/number comparison on key. */
  sortFn?: (a: T, b: T) => number;
  sortable?: boolean;
  /** Show/hide in column manager. */
  hideable?: boolean;
  defaultVisible?: boolean;
  /** Min column width (CSS string). */
  width?: string;
  align?: "left" | "center" | "right";
  /** Pin column to left edge (not scrollable). */
  pinned?: boolean;
  /** CSS class appended to th/td. */
  className?: string;
}

export interface CellContext<T> {
  rowIndex: number;
  isSelected: boolean;
  isDirty: boolean;
  startEdit: (key: string) => void;
}

// ── Filter definition ─────────────────────────────────────────────────────────

export type FilterType = "text" | "select" | "multi-select" | "boolean" | "date-range";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  type: FilterType;
  /** Static options list. */
  options?: FilterOption[];
  /** Derive options from current full dataset. */
  getOptions?: (data: T[]) => FilterOption[];
  /** Custom filter predicate. If omitted, uses default field matching. */
  filter?: (row: T, value: FilterValue) => boolean;
  /** Which field(s) to match against for default filtering. Defaults to key. */
  field?: keyof T | (keyof T)[];
  placeholder?: string;
}

export type FilterValue = string | string[] | boolean | [string, string] | null;
export type FiltersState = Record<string, FilterValue>;

// ── Sort state ────────────────────────────────────────────────────────────────

export interface SortEntry {
  key: string;
  dir: "asc" | "desc";
}

// ── Bulk actions ──────────────────────────────────────────────────────────────

export interface BulkAction<T> {
  key: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  handler: (selected: T[], clearSelection: () => void) => Promise<void> | void;
  /** Disable when condition is false. */
  disabled?: (selected: T[]) => boolean;
}

// ── Inline edit ───────────────────────────────────────────────────────────────

export interface InlineEditState {
  /** slug / id of the row being edited. */
  rowKey: string;
  /** column key being edited. */
  colKey: string;
}

export interface InlineEditSave<T> {
  row: T;
  colKey: string;
  newValue: unknown;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export const PAGE_SIZES = [10, 20, 30, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface PaginationState {
  page: number;
  pageSize: PageSize;
}

// ── Table state (persisted) ───────────────────────────────────────────────────

export interface PersistedTableState {
  sortEntries: SortEntry[];
  filters: FiltersState;
  visibleColumns: Record<string, boolean>;
  columnOrder: string[];
  pageSize: PageSize;
  density: "compact" | "normal" | "relaxed";
}

// ── DataTable props ───────────────────────────────────────────────────────────

export interface DataTableProps<T> {
  /** Unique id used as localStorage namespace. */
  id: string;
  data: T[];
  columns: ColumnDef<T>[];
  filters?: FilterDef<T>[];
  bulkActions?: BulkAction<T>[];
  /** Return a stable string key for each row (used for selection + dirty tracking). */
  getRowKey: (row: T) => string;
  /** Called when an inline edit is saved. Should return updated row or throw. */
  onInlineEdit?: (save: InlineEditSave<T>) => Promise<T> | T;
  /** Called when rows are bulk-deleted. */
  onBulkDelete?: (rows: T[]) => Promise<void>;
  /** Extra toolbar content rendered after the search bar. */
  toolbarLeft?: ReactNode;
  toolbarRight?: ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  /** Fuzzy search across these fields (dot-path strings). Defaults to all string columns. */
  searchFields?: (keyof T)[];
  /** If true, table shows a horizontal scrollbar and columns don't wrap. */
  horizontalScroll?: boolean;
  /** Sticky header height offset (px) for nested scroll containers. */
  stickyHeaderTop?: number;
  /** Row click handler (does not trigger when clicking action buttons). */
  onRowClick?: (row: T) => void;
  /** CSS class added to each <tr>. */
  rowClassName?: (row: T) => string;
  /** Disable virtualization (for small guaranteed-small datasets). */
  noVirtualize?: boolean;
}
