"use client";

import { Label } from "@/components/ui/label";
import { HORIZONTAL_ALIGN_OPTIONS } from "@/features/builder/constants/layout-presets";
import type { HorizontalAlign } from "@/types/block-system";

type Props = {
  value: HorizontalAlign | undefined;
  onChange: (value: HorizontalAlign | undefined) => void;
  inheritOption?: boolean;
};

export function HorizontalAlignField({ value, onChange, inheritOption = false }: Props) {
  return (
    <div>
      <Label>Block align</Label>
      <select
        className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        value={inheritOption ? (value ?? "") : (value ?? "left")}
        onChange={(e) => {
          const next = e.target.value;
          if (!next) {
            onChange(undefined);
            return;
          }
          onChange(next as HorizontalAlign);
        }}
      >
        {inheritOption ? <option value="">Inherit</option> : null}
        {HORIZONTAL_ALIGN_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Left and right follow the page direction (LTR/RTL).
      </p>
    </div>
  );
}
