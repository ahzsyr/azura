"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function ProductReviewsBlockFields({ block, onChange }: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Product slug</Label>
        <Input
          className="mt-1"
          placeholder="product-slug"
          value={(block.props.productSlug as string) ?? ""}
          onChange={(e) => setProp("productSlug", e.target.value)}
        />
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
