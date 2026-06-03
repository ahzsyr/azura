"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PostOption = {
  id: string;
  slug: string;
  titleEn: string;
  status: string;
};

type Props = {
  posts: PostOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function RelatedPostsSelect({ posts, selectedIds, onChange }: Props) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else if (selectedIds.length < 6) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div>
      <Label className="mb-2 block">Related posts (max 6)</Label>
      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
        {posts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs text-start max-w-full truncate",
              selectedIds.includes(p.id) ? "bg-primary/10 border-primary" : "hover:bg-muted"
            )}
            title={p.titleEn}
          >
            {p.titleEn}
            <span className="text-muted-foreground ms-1">({p.status})</span>
          </button>
        ))}
        {posts.length === 0 && (
          <p className="text-xs text-muted-foreground">Save this post first to pick related posts.</p>
        )}
      </div>
    </div>
  );
}
