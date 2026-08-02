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
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Testimonial, TestimonialCollectionItem } from "@prisma/client";
import {
  removeTestimonialFromCollection,
  reorderTestimonialCollectionItems,
} from "@/features/testimonials/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MemberRow = TestimonialCollectionItem & { testimonial: Testimonial };

type Props = {
  collectionId: string;
  items: MemberRow[];
};

function SortableMemberRow({
  collectionId,
  item,
}: {
  collectionId: string;
  item: MemberRow;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const t = item.testimonial;

  const handleRemove = () => {
    if (!confirm(`Remove "${t.name}" from this collection?`)) return;
    startTransition(async () => {
      await removeTestimonialFromCollection(collectionId, item.id);
      router.refresh();
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-3 rounded-lg border bg-card p-3", isDragging && "opacity-50")}
    >
      <button
        type="button"
        className="cursor-grab touch-none shrink-0"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {t.imageUrl ? (
        <Image src={t.imageUrl} alt={t.name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {t.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{t.location}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={handleRemove} disabled={pending}>
        Remove
      </Button>
    </div>
  );
}

export function TestimonialCollectionMemberList({ collectionId, items: initial }: Props) {
  const [items, setItems] = useState(initial);
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
      await reorderTestimonialCollectionItems(
        collectionId,
        reordered.map((i) => i.id)
      );
    });
  };

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No testimonials in this collection yet.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={cn("space-y-3", pending && "opacity-80")}>
          {items.map((item) => (
            <SortableMemberRow key={item.id} collectionId={collectionId} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
