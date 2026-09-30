"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { PRODUCT_COMPARE_MAX } from "@/features/comparison/product-comparison.constants";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function ProductComparisonBlockFields({ block, onChange }: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Product slugs (max {PRODUCT_COMPARE_MAX}, comma-separated)</Label>
        <Input
          className="mt-1"
          value={((block.props.productSlugs as string[]) ?? []).join(", ")}
          onChange={(e) =>
            setProp(
              "productSlugs",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, PRODUCT_COMPARE_MAX),
            )
          }
        />
      </div>
      <div>
        <Label className="text-xs">Compare mode</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.compareMode as string) ?? "all"}
          onChange={(e) => setProp("compareMode", e.target.value)}
        >
          <option value="all">All attributes</option>
          <option value="differences">Differences only</option>
          <option value="hideEqual">Hide equal rows</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.showCompareLink !== false}
          onChange={(e) => setProp("showCompareLink", e.target.checked)}
        />
        Link to full comparison page
      </label>
    </div>
  );
}
