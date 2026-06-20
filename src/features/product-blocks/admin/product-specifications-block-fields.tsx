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

export function ProductSpecificationsBlockFields({
  block,
  onChange,
  productOptions = [],
}: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const blockId = block.id ?? "product-specifications";

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
      <p className="text-xs text-muted-foreground">
        Leave empty and use manual groups in JSON import for preview-only specs.
      </p>
    </div>
  );
}
