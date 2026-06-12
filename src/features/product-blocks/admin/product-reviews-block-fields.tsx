"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import type { ProductBuilderOption } from "@/features/product-blocks/types";
import { ProductBuilderSelect } from "@/features/product-blocks/admin/builder-catalog-selects";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  productOptions?: ProductBuilderOption[];
};

export function ProductReviewsBlockFields({
  block,
  onChange,
  productOptions = [],
}: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const blockId = block.id ?? "product-reviews";

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Product</Label>
        <div className="mt-1">
          <ProductBuilderSelect
            id={`${blockId}-product`}
            products={productOptions}
            value={(block.props.productSlug as string) ?? ""}
            onChange={(slug) => setProp("productSlug", slug)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.allowSorting !== false}
          onChange={(e) => setProp("allowSorting", e.target.checked)}
        />
        Allow review sorting
      </label>
    </div>
  );
}
