"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  onAdd: () => void;
  children: React.ReactNode;
  empty?: boolean;
};

export function RepeatableSection({ label, onAdd, children, empty }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onAdd}>
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {empty ? (
          <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
            No items yet. Click Add to create one.
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function ItemCard({
  onRemove,
  children,
  title,
  defaultOpen = true,
}: {
  onRemove: () => void;
  children: React.ReactNode;
  title?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const collapsible = title !== undefined;

  if (!collapsible) {
    return (
      <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={onRemove}>
            Remove
          </Button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/20">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-start"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
          <span className="truncate text-sm font-medium">{title || "Untitled"}</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 text-xs text-destructive"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
      {open ? <div className="space-y-2 border-t px-3 pb-3 pt-2">{children}</div> : null}
    </div>
  );
}
