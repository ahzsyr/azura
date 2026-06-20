"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import type {
  CollectionBuilderOption,
  ProductBuilderOption,
} from "@/features/product-blocks/types";
import {
  CollectionBuilderSelect,
  ProductBuilderMultiSelect,
} from "@/features/product-blocks/admin/builder-catalog-selects";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  showLimit?: boolean;
  showSort?: boolean;
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
};

export function ProductSelectionFields({
  block,
  onChange,
  showLimit = true,
  showSort = true,
  collectionOptions = [],
  productOptions = [],
}: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const source = (block.props.source as string) ?? "collection";
  const blockId = block.id ?? "product-selection";

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
          <option value="manual">Manual products</option>
          <option value="featured">Featured / top rated</option>
          <option value="tags">Tags</option>
        </select>
      </div>
      {source === "collection" && (
        <div>
          <Label className="text-xs">Collection</Label>
          <div className="mt-1">
            <CollectionBuilderSelect
              id={`${blockId}-collection`}
              collections={collectionOptions}
              value={(block.props.collectionSlug as string) ?? ""}
              onChange={(slug) => setProp("collectionSlug", slug)}
            />
          </div>
          {collectionOptions.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">No collections loaded.</p>
          )}
        </div>
      )}
      {source === "manual" && (
        <div>
          <Label className="text-xs">Products</Label>
          <div className="mt-1">
            <ProductBuilderMultiSelect
              id={`${blockId}-products`}
              products={productOptions}
              value={(block.props.productSlugs as string[]) ?? []}
              onChange={(slugs) => setProp("productSlugs", slugs)}
            />
          </div>
          {productOptions.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">No products loaded.</p>
          )}
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
