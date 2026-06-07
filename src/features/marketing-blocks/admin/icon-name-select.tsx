"use client";

import { Label } from "@/components/ui/label";
import { MARKETING_ICON_OPTIONS } from "@/features/marketing-blocks/lib/icon-map";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function IconNameSelect({ value, onChange, label = "Icon" }: Props) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">None</option>
        {MARKETING_ICON_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
