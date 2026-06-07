"use client";

import { Button } from "@/components/ui/button";

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
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
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
