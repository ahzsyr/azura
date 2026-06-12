"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import type {
  CollectionBuilderOption,
  ProductBuilderOption,
} from "@/features/product-blocks/types";
import {
  CollectionBuilderSelect,
  ProductBuilderMultiSelect,
  ProductBuilderSelect,
} from "@/features/product-blocks/admin/builder-catalog-selects";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
};

export function RelatedProductsBlockFields({
  block,
  onChange,
  collectionOptions = [],
  productOptions = [],
}: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const rule = (block.props.rule as string) ?? "collection";
  const blockId = block.id ?? "related-products";

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Recommendation rule</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={rule}
          onChange={(e) => setProp("rule", e.target.value)}
        >
          <option value="collection">Same collection</option>
          <option value="anchor">Related to anchor product</option>
          <option value="brand">Same brand</option>
          <option value="tags">Matching tags</option>
          <option value="manual">Manual products</option>
        </select>
      </div>
      {rule === "anchor" && (
        <div>
          <Label className="text-xs">Anchor product</Label>
          <div className="mt-1">
            <ProductBuilderSelect
              id={`${blockId}-anchor`}
              products={productOptions}
              value={(block.props.anchorSlug as string) ?? ""}
              onChange={(slug) => setProp("anchorSlug", slug)}
            />
          </div>
        </div>
      )}
      {rule === "collection" && (
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
        </div>
      )}
      {rule === "brand" && (
        <div>
          <Label className="text-xs">Brand name</Label>
          <Input
            className="mt-1"
            placeholder="Brand name"
            value={(block.props.brand as string) ?? ""}
            onChange={(e) => setProp("brand", e.target.value)}
          />
        </div>
      )}
      {rule === "tags" && (
        <div>
          <Label className="text-xs">Tags (comma-separated)</Label>
          <Input
            className="mt-1"
            placeholder="tag-one, tag-two"
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
      {rule === "manual" && (
        <div>
          <Label className="text-xs">Products</Label>
          <div className="mt-1">
            <ProductBuilderMultiSelect
              id={`${blockId}-manual`}
              products={productOptions}
              value={(block.props.productSlugs as string[]) ?? []}
              onChange={(slugs) => setProp("productSlugs", slugs)}
            />
          </div>
        </div>
      )}
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "grid"}
          onChange={(e) => setProp("layout", e.target.value)}
        >
          <option value="grid">Grid</option>
          <option value="carousel">Carousel</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Max products</Label>
        <Input
          type="number"
          min={1}
          max={24}
          className="mt-1"
          value={String(block.props.limit ?? 4)}
          onChange={(e) => setProp("limit", Number(e.target.value))}
        />
      </div>
    </div>
  );
}
