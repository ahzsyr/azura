"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  searchTerms?: string[];
  className?: string;
};

export function ThemeToggle({
  label,
  description,
  checked,
  onChange,
  searchTerms = [],
  className,
}: Props) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4", className)}
      data-theme-search={[label, description, ...searchTerms].join(" ").toLowerCase()}
    >
      <div className="space-y-0.5">
        <Label htmlFor={`theme-toggle-${label}`}>{label}</Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <input
        id={`theme-toggle-${label}`}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 rounded border"
      />
    </div>
  );
}
