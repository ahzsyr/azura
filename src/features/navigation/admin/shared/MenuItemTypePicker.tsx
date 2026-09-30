"use client";

import { cn } from "@/lib/utils";

export type MenuPickerType = "link" | "page" | "collection" | "brand" | "tag" | "product" | "image";

const SUPPORTED: { value: MenuPickerType; label: string }[] = [
  { value: "page", label: "Page" },
  { value: "collection", label: "Category" },
  { value: "brand", label: "Brand" },
  { value: "product", label: "Product" },
  { value: "tag", label: "Tag" },
  { value: "link", label: "Link" },
  { value: "image", label: "Photo" },
];

type Props = {
  value: MenuPickerType;
  onChange: (next: MenuPickerType) => void;
  className?: string;
};

export function MenuItemTypePicker({ value, onChange, className }: Props) {
  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4", className)} role="group" aria-label="Destination type">
      {SUPPORTED.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn(
            "rounded-xl border px-2 py-3 text-center text-xs font-semibold transition-colors",
            value === opt.value
              ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/25"
              : "border-border/80 bg-card text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
          )}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
