"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import type {
  CollectionBuilderOption,
  OrderingProfileBuilderOption,
  ProductBuilderOption,
} from "@/features/builder/blocks/commerce/product-blocks/types";
import {
  CollectionBuilderSelect,
  ProductBuilderMultiSelect,
} from "@/features/builder/blocks/commerce/product-blocks/admin/builder-catalog-selects";
import { OrderingProfileSelect } from "@/features/builder/blocks/commerce/product-blocks/admin/ordering-profile-select";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  showLimit?: boolean;
  showSort?: boolean;
  showOrderingProfile?: boolean;
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
  orderingProfileOptions?: OrderingProfileBuilderOption[];
  /** Prop key for ordering profile id (showcase tabs use a nested path via onChange). */
  orderingProfilePropKey?: string;
};

export function ProductSelectionFields({
  block,
  onChange,
  showLimit = true,
  showSort = true,
  showOrderingProfile = true,
  collectionOptions = [],
  productOptions = [],
  orderingProfileOptions = [],
  orderingProfilePropKey = "orderingProfileId",
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
      {showOrderingProfile && source !== "manual" ? (
        <OrderingProfileSelect
          value={(block.props[orderingProfilePropKey] as string) ?? ""}
          onChange={(id) => setProp(orderingProfilePropKey, id)}
          options={orderingProfileOptions}
        />
      ) : null}
      {showSort && source === "manual" ? (
        <div>
          <Label className="text-xs">Sort</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.sortBy as string) ?? "name-asc"}
            onChange={(e) => setProp("sortBy", e.target.value)}
            disabled
          >
            <option value="name-asc">Manual order (as selected)</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}
