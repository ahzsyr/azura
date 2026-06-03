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
import { GripVertical, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TestimonialAdmin } from "@/features/testimonials/types";
import {
  deleteTestimonial,
  reorderTestimonials,
  toggleTestimonialPublished,
} from "@/features/testimonials/actions";
import { TestimonialEditPanel } from "./testimonial-edit-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@prisma/client";

type Props = {
  testimonials: TestimonialAdmin[];
};

function SortableRow({
  item,
  expanded,
  onToggleExpand,
}: {
  item: TestimonialAdmin;
  expanded: boolean;
  onToggleExpand: () => void;
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
      await toggleTestimonialPublished(item.id, !item.isPublished);
      refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete testimonial from "${item.name}"?`)) return;
    startTransition(async () => {
      await deleteTestimonial(item.id);
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
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {item.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{item.name}</p>
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-accent text-accent" />
              {item.rating}
            </span>
            {!item.isPublished && (
              <Badge variant="secondary" className="text-[10px]">
                Hidden
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{item.location}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.contentEn}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          <Button type="button" size="sm" variant="outline" onClick={onToggleExpand}>
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
      {expanded && <TestimonialEditPanel testimonial={item as Testimonial} />}
    </div>
  );
}

export function TestimonialAllList({ testimonials: initial }: Props) {
  const [items, setItems] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    setItems(reordered);
    startTransition(async () => {
      await reorderTestimonials(reordered.map((i) => i.id));
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <Star className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 font-medium">No testimonials yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Use the Add testimonial tab to create your first review.</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={cn("space-y-3", pending && "opacity-80")}>
          {items.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              expanded={editingId === item.id}
              onToggleExpand={() => setEditingId(editingId === item.id ? null : item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
