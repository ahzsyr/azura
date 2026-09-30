"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatUpdatedAt,
  popupTypeLabel,
  summarizeFrequency,
  summarizeTargeting,
  summarizeTrigger,
} from "@/features/popups/admin/lib/popup-summaries";
import {
  getPopupAdminStatus,
  popupStatusLabel,
} from "@/features/popups/admin/lib/popup-status";
import type { PopupItem } from "@/features/popups/popup.schema";
import { cn } from "@/lib/utils";

type Props = {
  item: PopupItem;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function PopupListItem({
  item,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const status = getPopupAdminStatus(item);
  const updated = formatUpdatedAt(item.updatedAt);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("popup-admin-list-item", isDragging && "is-dragging")}
    >
      <button
        type="button"
        className="popup-admin-list-item__drag cursor-grab touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button type="button" className="popup-admin-list-item__main" onClick={onEdit}>
        <span className="popup-admin-list-item__top">
          <span className={cn("popup-admin-status-dot", `is-${status}`)} aria-hidden />
          <span className="popup-admin-list-item__name">{item.name}</span>
          <span className="popup-admin-type-badge">{popupTypeLabel(item.type)}</span>
        </span>
        <span className="popup-admin-list-item__meta">
          {summarizeTargeting(item)} · {summarizeFrequency(item)} · {popupStatusLabel(status)}
        </span>
        <span className="popup-admin-list-item__meta">
          {summarizeTrigger(item)}
          {updated ? ` · Updated ${updated}` : ""}
        </span>
      </button>

      <label className="popup-admin-list-item__toggle">
        <input
          type="checkbox"
          checked={item.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={item.enabled ? "Disable popup" : "Enable popup"}
        />
        <span>{item.enabled ? "On" : "Off"}</span>
      </label>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Popup actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
