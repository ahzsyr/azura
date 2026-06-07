"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { tableColumnSchema, tableFeaturesSchema, tableRowSchema } from "@/features/content-blocks/schemas/content-blocks";
import type { z } from "zod";
import type { Locale } from "@/i18n/routing";
import { pickLocaleArrayField } from "@/features/content-blocks/lib/locale-field";

type Column = z.infer<typeof tableColumnSchema>;
type Row = z.infer<typeof tableRowSchema>;
type Features = z.infer<typeof tableFeaturesSchema>;

type Props = {
  title?: string;
  columns: Column[];
  rows: Row[];
  features: Features;
  striped?: boolean;
  compact?: boolean;
  locale: Locale;
};

type SortDir = "asc" | "desc" | null;

export function TableBlockIsland({
  title,
  columns,
  rows,
  features,
  striped = true,
  compact = false,
  locale,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterCol, setFilterCol] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  const colLabels = useMemo(
    () =>
      columns.map((c) => ({
        ...c,
        label: pickLocaleArrayField(c, "label", locale) || c.id,
      })),
    [columns, locale]
  );

  const filtered = useMemo(() => {
    let result = [...rows];
    const q = search.trim().toLowerCase();
    if (features.searchable && q) {
      result = result.filter((row) =>
        colLabels.some((col) => (row.cells[col.id] ?? "").toLowerCase().includes(q))
      );
    }
    if (features.filterable && filterCol) {
      result = result.filter((row) => (row.cells[filterCol] ?? "").trim().length > 0);
    }
    if (features.sortable && sortCol && sortDir) {
      result.sort((a, b) => {
        const av = (a.cells[sortCol] ?? "").toLowerCase();
        const bv = (b.cells[sortCol] ?? "").toLowerCase();
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, colLabels, search, filterCol, sortCol, sortDir, features]);

  const pageSize = features.pageSize || 10;
  const totalPages = features.paginated ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const paged = features.paginated
    ? filtered.slice(page * pageSize, page * pageSize + pageSize)
    : filtered;

  const toggleSort = (colId: string, sortable: boolean) => {
    if (!features.sortable || !sortable) return;
    if (sortCol !== colId) {
      setSortCol(colId);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortCol(null);
      setSortDir(null);
    }
  };

  if (columns.length === 0) return null;

  return (
    <div className="cb-table-block">
      {title && <h2 className="font-heading text-2xl font-bold mb-4">{title}</h2>}
      {(features.searchable || features.filterable) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {features.searchable && (
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="max-w-xs h-9"
            />
          )}
          {features.filterable && columns.length > 0 && (
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={filterCol}
              onChange={(e) => {
                setFilterCol(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All rows</option>
              {colLabels.map((col) => (
                <option key={col.id} value={col.id}>
                  Has {col.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className={cn("w-full text-sm", compact && "text-xs")}>
          <thead className="bg-muted/50">
            <tr>
              {colLabels.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "text-start px-4 py-3 font-medium",
                    features.sortable && col.sortable && "cursor-pointer select-none hover:bg-muted"
                  )}
                  onClick={() => toggleSort(col.id, col.sortable)}
                >
                  {col.label}
                  {sortCol === col.id && (sortDir === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, idx) => (
              <tr
                key={row.id}
                className={cn(striped && idx % 2 === 1 && "bg-muted/30", "border-t")}
              >
                {colLabels.map((col) => (
                  <td key={col.id} className="px-4 py-3 align-top">
                    {row.cells[col.id] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={colLabels.length} className="px-4 py-8 text-center text-muted-foreground">
                  No rows match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {features.paginated && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            type="button"
            className="text-sm px-3 py-1 rounded border disabled:opacity-40"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="text-sm px-3 py-1 rounded border disabled:opacity-40"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
