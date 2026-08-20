"use client";

import type { MenuItemVisibility, MenuPlacement } from "@/features/navigation/types";
import { Button } from "@/components/ui/button";

type Props = {
  count: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onPlacement: (p: MenuPlacement) => void;
  onVisibility: (v: MenuItemVisibility) => void;
  onMega: () => void;
  onExport: () => void;
  onClear: () => void;
};

export function MenuBulkToolbar({
  count,
  onDelete,
  onDuplicate,
  onPlacement,
  onVisibility,
  onMega,
  onExport,
  onClear,
}: Props) {
  if (count === 0) return null;
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2.5 shadow-sm backdrop-blur">
      <span className="text-sm font-medium">{count} selected</span>
      <Button size="sm" variant="outline" onClick={onDuplicate}>
        Duplicate
      </Button>
      <Button size="sm" variant="outline" onClick={() => onVisibility("visible")}>
        Visible
      </Button>
      <Button size="sm" variant="outline" onClick={() => onVisibility("hidden")}>
        Hidden
      </Button>
      <Button size="sm" variant="outline" onClick={() => onPlacement("desktop")}>
        Desktop
      </Button>
      <Button size="sm" variant="outline" onClick={() => onPlacement("mobile")}>
        Mobile
      </Button>
      <Button size="sm" variant="outline" onClick={() => onPlacement("both")}>
        Both
      </Button>
      <Button size="sm" variant="outline" onClick={onMega}>
        Mega
      </Button>
      <Button size="sm" variant="outline" onClick={onExport}>
        Export
      </Button>
      <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete}>
        Delete
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
