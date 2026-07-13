"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Film, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { GalleryMediaAdmin } from "@/features/gallery/types";
import {
  bulkDeleteGalleryMedia,
  bulkSetGalleryMediaPublished,
  deleteGalleryMedia,
  reorderGalleryMedia,
  toggleGalleryMediaPublished,
} from "@/features/gallery/actions";
import { GalleryMediaEditModal } from "./gallery-media-edit-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  galleryId: string;
  items: GalleryMediaAdmin[];
  onAddMedia?: () => void;
};

function SortableMediaRow({
  item,
  selected,
  onSelectChange,
  onEdit,
  disabled,
}: {
  item: GalleryMediaAdmin;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
  onEdit: () => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const rowPending = pending || disabled;

  const refresh = () => router.refresh();

  const togglePublished = () => {
    startTransition(async () => {
      await toggleGalleryMediaPublished(item.id, !item.isPublished);
      refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${item.titleEn}"?`)) return;
    startTransition(async () => {
      await deleteGalleryMedia(item.id);
      refresh();
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card p-3",
        isDragging && "opacity-50",
        selected && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <label
          className="mt-1 flex shrink-0 cursor-pointer items-center"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={selected}
            disabled={rowPending}
            onChange={(e) => onSelectChange(e.target.checked)}
            aria-label={`Select ${item.titleEn}`}
          />
        </label>

        <button
          type="button"
          className="mt-1 cursor-grab touch-none shrink-0"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          disabled={rowPending}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
          {item.mediaKind === "VIDEO" ? (
            <video src={item.mediaUrl} className="h-full w-full object-cover" muted />
          ) : (
            <img src={item.mediaUrl} alt={item.titleEn} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium truncate">{item.titleEn}</p>
            <Badge variant="outline" className="text-[10px]">
              {item.mediaKind === "VIDEO" ? (
                <>
                  <Film className="me-1 h-3 w-3" /> Video
                </>
              ) : (
                <>
                  <ImageIcon className="me-1 h-3 w-3" /> Image
                </>
              )}
            </Badge>
            {!item.isPublished && (
              <Badge variant="secondary" className="text-[10px]">
                Hidden
              </Badge>
            )}
          </div>
          {item.excerptEn && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.excerptEn}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-1">
          <Button type="button" size="sm" variant="outline" onClick={onEdit} disabled={rowPending}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={togglePublished} disabled={rowPending}>
            {item.isPublished ? "Hide" : "Show"}
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={rowPending}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GalleryMediaSortList({ galleryId, items, onAddMedia }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<GalleryMediaAdmin | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = items.map((i) => i.id);
  const selectedCount = selectedIds.size;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0 && selectedCount < items.length;

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => itemIds.includes(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [itemIds]);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(itemIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runBulk = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action();
      clearSelection();
      router.refresh();
    });
  };

  const bulkHide = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    runBulk(() => bulkSetGalleryMediaPublished(ids, false));
  };

  const bulkShow = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    runBulk(() => bulkSetGalleryMediaPublished(ids, true));
  };

  const bulkDelete = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected item${ids.length === 1 ? "" : "s"}?`)) return;
    runBulk(() => bulkDeleteGalleryMedia(ids));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    startTransition(async () => {
      await reorderGalleryMedia(
        galleryId,
        reordered.map((i) => i.id)
      );
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        <p>No media yet.</p>
        {onAddMedia ? (
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onAddMedia}>
            Add media
          </Button>
        ) : (
          <p className="mt-2">Use Add media to add photos or videos.</p>
        )}
      </div>
    );
  }

  return (
    <>
      {selectedCount > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <Button type="button" size="sm" variant="outline" onClick={bulkHide} disabled={pending}>
            Hide
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={bulkShow} disabled={pending}>
            Show
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={bulkDelete} disabled={pending}>
            Delete
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ms-auto"
            onClick={clearSelection}
            disabled={pending}
          >
            Clear selection
          </Button>
        </div>
      ) : null}

      <div className="mb-2 flex items-center gap-2 px-1">
        <input
          ref={selectAllRef}
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={allSelected}
          onChange={toggleSelectAll}
          disabled={pending}
          aria-label="Select all media"
        />
        <span className="text-xs text-muted-foreground">Select all</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className={cn("space-y-2", pending && "opacity-70")}>
            {items.map((item) => (
              <SortableMediaRow
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelectChange={(checked) => toggleSelect(item.id, checked)}
                onEdit={() => setEditingItem(item)}
                disabled={pending}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <GalleryMediaEditModal
        item={editingItem}
        galleryId={galleryId}
        open={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      />
    </>
  );
}
