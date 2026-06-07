"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  showLimit?: boolean;
  showSort?: boolean;
};

export function ProductSelectionFields({
  block,
  onChange,
  showLimit = true,
  showSort = true,
}: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const source = (block.props.source as string) ?? "collection";

  return (
    <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Product selection
      </p>
      <div>
        <Label className="text-xs">Source</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={source}
          onChange={(e) => setProp("source", e.target.value)}
        >
          <option value="collection">Collection</option>
          <option value="manual">Manual slugs</option>
          <option value="featured">Featured / top rated</option>
          <option value="tags">Tags</option>
        </select>
      </div>
      {source === "collection" && (
        <div>
          <Label className="text-xs">Collection slug</Label>
          <Input
            className="mt-1"
            placeholder="e.g. mikrotik"
            value={(block.props.collectionSlug as string) ?? ""}
            onChange={(e) => setProp("collectionSlug", e.target.value)}
          />
        </div>
      )}
      {source === "manual" && (
        <div>
          <Label className="text-xs">Product slugs (comma-separated)</Label>
          <Input
            className="mt-1"
            placeholder="slug-one, slug-two"
            value={((block.props.productSlugs as string[]) ?? []).join(", ")}
            onChange={(e) =>
              setProp(
                "productSlugs",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
      )}
      {source === "tags" && (
        <div>
          <Label className="text-xs">Tags (comma-separated)</Label>
          <Input
            className="mt-1"
            value={((block.props.tags as string[]) ?? []).join(", ")}
            onChange={(e) =>
              setProp(
                "tags",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
      )}
      {showLimit && (
        <div>
          <Label className="text-xs">Max products</Label>
          <Input
            type="number"
            min={1}
            max={48}
            className="mt-1"
            value={String(block.props.limit ?? 8)}
            onChange={(e) => setProp("limit", Number(e.target.value))}
          />
        </div>
      )}
      {showSort && (
        <div>
          <Label className="text-xs">Sort</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.sortBy as string) ?? "name-asc"}
            onChange={(e) => setProp("sortBy", e.target.value)}
          >
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="price-asc">Price low–high</option>
            <option value="price-desc">Price high–low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      )}
    </div>
  );
}
