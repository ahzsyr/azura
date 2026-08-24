"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CatalogSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  trailing?: React.ReactNode;
};

export function CatalogSearch({
  value,
  onChange,
  placeholder = "Search…",
  className,
  trailing,
}: CatalogSearchProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border/80 bg-background px-3 py-2",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
      />
      {trailing}
    </div>
  );
}
