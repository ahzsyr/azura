"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  searchTerms?: string[];
  className?: string;
};

export function ThemeSlider({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  formatValue,
  searchTerms = [],
  className,
}: Props) {
  const display = formatValue ? formatValue(value) : String(value);

  return (
    <div
      className={cn("space-y-2", className)}
      data-theme-search={[label, ...searchTerms].join(" ").toLowerCase()}
    >
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
