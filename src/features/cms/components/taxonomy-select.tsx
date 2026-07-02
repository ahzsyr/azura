"use client";

import type { PostCategory, PostTag } from "@prisma/client";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  categories: PostCategory[];
  tags: PostTag[];
  selectedCategoryIds: string[];
  selectedTagIds: string[];
  onCategoriesChange: (ids: string[]) => void;
  onTagsChange: (ids: string[]) => void;
};

export function TaxonomySelect({
  categories,
  tags,
  selectedCategoryIds,
  selectedTagIds,
  onCategoriesChange,
  onTagsChange,
}: Props) {
  const toggle = (ids: string[], id: string, setter: (v: string[]) => void) => {
    setter(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <Label className="mb-2 block">Categories</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(selectedCategoryIds, c.id, onCategoriesChange)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                selectedCategoryIds.includes(c.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              )}
            >
              {c.slug}
            </button>
          ))}
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground">
              <Link href="/admin/posts/categories" className="text-primary underline">
                Add categories
              </Link>
            </p>
          )}
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Tags</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(selectedTagIds, t.id, onTagsChange)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                selectedTagIds.includes(t.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              )}
            >
              {t.slug}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
