"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CatalogDrawer, CatalogSearch } from "@/features/catalog/admin/ui";

export type AssignCategoryOption = {
  id: string;
  slug: string;
  name: string;
};

export type AssignCategoriesMode = "assign" | "remove";

export type AssignCategoriesDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AssignCategoriesMode;
  categories: AssignCategoryOption[];
  selectedProductCount: number;
  /** Per-product current categoryIds (slug → ids). Used for Already assigned / Will add. */
  productCategoryIds?: Record<string, string[]>;
  selectedProductSlugs?: string[];
  applying?: boolean;
  applyProgress?: { current: number; total: number } | null;
  onApply: (categoryIds: string[]) => void | Promise<void>;
};

export function AssignCategoriesDrawer({
  open,
  onOpenChange,
  mode,
  categories,
  selectedProductCount,
  productCategoryIds = {},
  selectedProductSlugs = [],
  applying = false,
  applyProgress = null,
  onApply,
}: AssignCategoriesDrawerProps) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIds([]);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [categories, query]);

  const summary = useMemo(() => {
    if (!selectedIds.length || !selectedProductSlugs.length) {
      return { alreadyAssigned: 0, willChange: 0 };
    }
    const selectedSet = new Set(selectedIds);
    let alreadyAssigned = 0;
    let willChange = 0;
    for (const slug of selectedProductSlugs) {
      const current = new Set(productCategoryIds[slug] ?? []);
      for (const id of selectedSet) {
        const has = current.has(id);
        if (mode === "assign") {
          if (has) alreadyAssigned += 1;
          else willChange += 1;
        } else if (has) {
          willChange += 1;
        } else {
          alreadyAssigned += 1;
        }
      }
    }
    return { alreadyAssigned, willChange };
  }, [mode, productCategoryIds, selectedIds, selectedProductSlugs]);

  const title = mode === "assign" ? "Assign Categories" : "Remove Categories";
  const description =
    mode === "assign"
      ? "Add the selected categories to every selected product."
      : "Remove the selected categories from every selected product.";

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <CatalogDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={applying}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={applying || selectedIds.length === 0 || selectedProductCount === 0}
            onClick={() => void onApply(selectedIds)}
          >
            {applying && applyProgress && applyProgress.total > 0
              ? `Applying… ${applyProgress.current}/${applyProgress.total}`
              : applying
                ? "Applying…"
                : "Apply"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {selectedProductCount} product{selectedProductCount === 1 ? "" : "s"} selected
        </p>

        {applying && applyProgress && applyProgress.total > 0 ? (
          <div className="space-y-1" role="status" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{
                  width: `${Math.min(100, Math.round((applyProgress.current / applyProgress.total) * 100))}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Updating products ({applyProgress.current}/{applyProgress.total})
            </p>
          </div>
        ) : null}

        <CatalogSearch
          value={query}
          onChange={setQuery}
          placeholder="Search categories…"
        />

        <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-md border p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No categories match.
            </p>
          ) : (
            filtered.map((cat) => {
              const checked = selectedIds.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    onChange={() => toggle(cat.id)}
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{cat.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      /{cat.slug}
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>

        {selectedIds.length > 0 ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {mode === "assign" ? (
              <>
                <div>
                  Already assigned:{" "}
                  <span className="font-medium text-foreground">{summary.alreadyAssigned}</span>{" "}
                  product×category links
                </div>
                <div>
                  Will add:{" "}
                  <span className="font-medium text-foreground">{summary.willChange}</span>{" "}
                  links
                </div>
              </>
            ) : (
              <>
                <div>
                  Not currently assigned:{" "}
                  <span className="font-medium text-foreground">{summary.alreadyAssigned}</span>
                </div>
                <div>
                  Will remove:{" "}
                  <span className="font-medium text-foreground">{summary.willChange}</span>{" "}
                  links
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </CatalogDrawer>
  );
}
