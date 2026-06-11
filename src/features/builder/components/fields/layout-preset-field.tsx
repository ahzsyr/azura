"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PresetOption<T extends string> = { value: T; label: string };

type LayoutPresetFieldProps<T extends string> = {
  label: string;
  preset: T;
  customValue: string;
  options: PresetOption<T>[];
  onPresetChange: (preset: T) => void;
  onCustomChange: (value: string) => void;
  customPlaceholder?: string;
};

export function LayoutPresetField<T extends string>({
  label,
  preset,
  customValue,
  options,
  onPresetChange,
  onCustomChange,
  customPlaceholder = "Custom value",
}: LayoutPresetFieldProps<T>) {
  const isCustom = preset === "custom";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        value={preset}
        onChange={(e) => onPresetChange(e.target.value as T)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isCustom && (
        <Input
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder={customPlaceholder}
          className="font-mono text-xs"
        />
      )}
    </div>
  );
}
