"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const UI_MESSAGE_PAGE_SIZES = [10, 20, 30, 50, 100] as const;
export type UiMessagePageSize = (typeof UI_MESSAGE_PAGE_SIZES)[number];

type Props = {
  page: number;
  pageSize: UiMessagePageSize;
  totalRows: number;
  onPage: (page: number) => void;
  onPageSize: (size: UiMessagePageSize) => void;
  className?: string;
};

export function UiMessagesPagination({
  page,
  pageSize,
  totalRows,
  onPage,
  onPageSize,
  className,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pages = useMemo(() => {
    const result: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      if (safePage > 3) result.push("…");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        result.push(i);
      }
      if (safePage < totalPages - 2) result.push("…");
      result.push(totalPages);
    }
    return result;
  }, [safePage, totalPages]);

  const startRow = totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, totalRows);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm",
        className,
      )}
    >
      <span className="text-muted-foreground tabular-nums">
        Showing <strong className="text-foreground">{startRow}</strong>–
        <strong className="text-foreground">{endRow}</strong> of{" "}
        <strong className="text-foreground">{totalRows}</strong> keys
      </span>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage === 1}
          onClick={() => onPage(1)}
          title="First page"
        >
          «
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage === 1}
          onClick={() => onPage(safePage - 1)}
          title="Previous page"
        >
          ‹
        </Button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              type="button"
              variant={safePage === p ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-8 px-2"
              onClick={() => onPage(p)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage === totalPages}
          onClick={() => onPage(safePage + 1)}
          title="Next page"
        >
          ›
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage === totalPages}
          onClick={() => onPage(totalPages)}
          title="Last page"
        >
          »
        </Button>
      </div>

      <label className="flex items-center gap-2 text-muted-foreground">
        Rows
        <select
          className="border rounded-md h-8 px-2 text-sm bg-background text-foreground"
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value) as UiMessagePageSize)}
        >
          {UI_MESSAGE_PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
