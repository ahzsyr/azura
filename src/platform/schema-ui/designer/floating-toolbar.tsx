"use client";

import type { ReactNode } from "react";
import { Copy, Trash2, Rows3, LayoutGrid, GripVertical } from "lucide-react";

export function FloatingToolbar({
  visible,
  onDuplicate,
  onDelete,
  onWrapSection,
  onWrapGrid,
}: {
  visible: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onWrapSection: () => void;
  onWrapGrid: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center gap-1 rounded-xl border bg-background/95 px-2 py-1.5 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <span className="me-1 flex items-center gap-1 border-e pe-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <GripVertical className="h-3.5 w-3.5" />
        Edit
      </span>
      <ToolBtn onClick={onDuplicate} icon={<Copy className="h-3.5 w-3.5" />} label="Duplicate" />
      <ToolBtn onClick={onDelete} icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" />
      <ToolBtn onClick={onWrapSection} icon={<Rows3 className="h-3.5 w-3.5" />} label="Wrap" />
      <ToolBtn onClick={onWrapGrid} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Grid" />
    </div>
  );
}

function ToolBtn({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:bg-muted"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
