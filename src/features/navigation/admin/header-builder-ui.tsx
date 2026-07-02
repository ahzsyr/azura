"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function HeaderField({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function HeaderSelect({
  id,
  value,
  onChange,
  children,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      id={id}
      className={cn(selectClassName, className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

export function OptionButtonGroup<T extends string>({
  value,
  options,
  onChange,
  columns = 2,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3 | 4;
}) {
  const gridCols =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : columns === 4
          ? "grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("grid gap-2", gridCols)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
            value === opt.value
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-border bg-background hover:bg-muted/50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export { selectClassName };
