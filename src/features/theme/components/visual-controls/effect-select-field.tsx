"use client";

import { Label } from "@/components/ui/label";

type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
};

export function EffectSelectField({ label, value, options, onChange, hint, disabled }: Props) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        className="mt-1 h-10 w-full rounded-md border px-3 text-sm disabled:opacity-50"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value || "empty"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
