"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ThemeSelectOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: ThemeSelectOption[];
  onChange: (value: string) => void;
  searchTerms?: string[];
  className?: string;
};

export function ThemeSelect({
  label,
  value,
  options,
  onChange,
  searchTerms = [],
  className,
}: Props) {
  return (
    <div
      className={cn("space-y-2", className)}
      data-theme-search={[label, ...searchTerms, ...options.map((o) => o.label)].join(" ").toLowerCase()}
    >
      <Label>{label}</Label>
      <select
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
