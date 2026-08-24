"use client";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  dir?: "ltr" | "rtl";
};

export function CategoryExplorerPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  dir = "ltr",
}: Props) {
  if (totalPages <= 1) return null;

  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-center gap-3"
      aria-label="Category pagination"
      dir={dir}
    >
      <button
        type="button"
        className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-muted-foreground">
        {first}–{last} of {total} · Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
