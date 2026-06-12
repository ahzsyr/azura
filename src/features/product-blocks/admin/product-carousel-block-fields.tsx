"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ProductSelectionFields } from "@/features/product-blocks/admin/product-selection-fields";
import type {
  CollectionBuilderOption,
  ProductBuilderOption,
} from "@/features/product-blocks/types";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
};

export function ProductCarouselBlockFields({
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(block.props.autoplay)}
            onChange={(e) => setProp("autoplay", e.target.checked)}
          />
          Autoplay
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={block.props.showArrows !== false}
            onChange={(e) => setProp("showArrows", e.target.checked)}
          />
          Arrows
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(block.props.showDots)}
            onChange={(e) => setProp("showDots", e.target.checked)}
          />
          Dots
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={block.props.loop !== false}
            onChange={(e) => setProp("loop", e.target.checked)}
          />
          Loop
        </label>
      </div>
      <div>
        <Label className="text-xs">Slides per view (desktop)</Label>
        <Input
          type="number"
          min={1}
          max={4}
          className="mt-1"
          value={String(block.props.slidesPerView ?? 3)}
          onChange={(e) => setProp("slidesPerView", Number(e.target.value))}
        />
      </div>
      <div>
        <Label className="text-xs">Autoplay interval (ms)</Label>
        <Input
          type="number"
          className="mt-1"
          value={String(block.props.autoplayIntervalMs ?? 5000)}
          onChange={(e) => setProp("autoplayIntervalMs", Number(e.target.value))}
        />
      </div>
    </div>
  );
}
