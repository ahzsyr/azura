"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";

type Props = {
  block: BlockNode;
  onChange: (key: string, value: boolean) => void;
};

const FIELDS = [
  { key: "showPrice", label: "Price" },
  { key: "showRating", label: "Rating" },
  { key: "showStock", label: "Stock badge" },
  { key: "showCompare", label: "Compare" },
] as const;

export function ProductCardDisplayOverrideFields({ block, onChange }: Props) {
  return (
    <fieldset className="space-y-2 border border-dashed rounded-md p-3">
      <legend className="text-xs font-medium px-1">Card display overrides</legend>
      <p className="text-xs text-muted-foreground m-0">
        Uncheck to hide elements on this block only. Global settings in Product Manager still apply.
      </p>
      {FIELDS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={block.props[key] !== false}
            onChange={(e) => onChange(key, e.target.checked)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
