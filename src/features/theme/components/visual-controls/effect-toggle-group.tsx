"use client";

import { Label } from "@/components/ui/label";

type ToggleItem = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

type Props = {
  items: ToggleItem[];
};

export function EffectToggleGroup({ items }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => item.onChange(e.target.checked)}
          />
          {item.label}
        </label>
      ))}
    </div>
  );
}

export function EffectToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <EffectToggleGroup items={[{ id: label, label: "Enabled", checked, onChange }]} />
    </div>
  );
}
