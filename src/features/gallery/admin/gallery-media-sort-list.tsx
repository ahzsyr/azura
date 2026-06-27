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
import { useTransition, type RefObject } from "react";
import type { GalleryMediaAdmin } from "@/features/gallery/types";
import {
  deleteGalleryMedia,
  reorderGalleryMedia,
  toggleGalleryMediaPublished,
} from "@/features/gallery/actions";
import { GalleryMediaEditPanel } from "./gallery-media-edit-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  galleryId: string;
  items: GalleryMediaAdmin[];
  editingMediaId?: string | null;
  onEditingMediaChange?: (id: string | null) => void;
  mediaFormRef?: RefObject<HTMLFormElement | null>;
};

function SortableMediaRow({
  item,
  galleryId,
  expanded,
  onToggleExpand,
  mediaFormRef,
}: {
  item: GalleryMediaAdmin;
  galleryId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  mediaFormRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

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
      className={cn("rounded-lg border bg-card p-3", isDragging && "opacity-50")}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none shrink-0"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
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
          <Button type="button" size="sm" variant="outline" onClick={onToggleExpand} disabled={pending}>
            {expanded ? "Close" : "Edit"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={togglePublished} disabled={pending}>
            {item.isPublished ? "Hide" : "Show"}
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
            Delete
          </Button>
        </div>
      </div>

      {expanded && (
        <GalleryMediaEditPanel
          item={item}
          galleryId={galleryId}
          onClose={onToggleExpand}
          embedded
          formRef={expanded ? mediaFormRef : undefined}
        />
      )}
    </div>
  );
}

export function GalleryMediaSortList({
  galleryId,
  items,
  editingMediaId = null,
  onEditingMediaChange,
  mediaFormRef,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const toggleExpand = (itemId: string) => {
    const next = editingMediaId === itemId ? null : itemId;
    onEditingMediaChange?.(next);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No media yet. Use the Add Media tab to add photos or videos.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={cn("space-y-2", pending && "opacity-70")}>
          {items.map((item) => (
            <SortableMediaRow
              key={item.id}
              item={item}
              galleryId={galleryId}
              expanded={editingMediaId === item.id}
              onToggleExpand={() => toggleExpand(item.id)}
              mediaFormRef={editingMediaId === item.id ? mediaFormRef : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
