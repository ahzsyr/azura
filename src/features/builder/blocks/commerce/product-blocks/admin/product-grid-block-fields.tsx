"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ProductSelectionFields } from "@/features/builder/blocks/commerce/product-blocks/admin/product-selection-fields";
import { ProductCardDisplayOverrideFields } from "@/features/builder/blocks/commerce/product-blocks/admin/product-card-display-override-fields";
import type {
  CollectionBuilderOption,
  ProductBuilderOption,
} from "@/features/builder/blocks/commerce/product-blocks/types";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
};

export function ProductGridBlockFields({
  block,
  onChange,
  collectionOptions = [],
  productOptions = [],
}: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <ProductSelectionFields
        block={block}
        onChange={onChange}
        collectionOptions={collectionOptions}
        productOptions={productOptions}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Columns</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={String(block.props.columns ?? 3)}
            onChange={(e) => setProp("columns", Number(e.target.value))}
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">View</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.viewMode as string) ?? "grid"}
            onChange={(e) => setProp("viewMode", e.target.value)}
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(block.props.showToolbar)}
          onChange={(e) => setProp("showToolbar", e.target.checked)}
        />
        Show filter / sort toolbar
      </label>
      {Boolean(block.props.showToolbar) && (
        <div>
          <Label className="text-xs">Page size</Label>
          <Input
            type="number"
            min={4}
            max={48}
            className="mt-1"
            value={String(block.props.pageSize ?? 12)}
            onChange={(e) => setProp("pageSize", Number(e.target.value))}
          />
        </div>
      )}
      <Input
        placeholder="View all link (optional)"
        value={(block.props.viewAllHref as string) ?? ""}
        onChange={(e) => setProp("viewAllHref", e.target.value)}
      />
      <ProductCardDisplayOverrideFields
        block={block}
        onChange={(key, value) => setProp(key, value)}
      />
    </div>
  );
}
