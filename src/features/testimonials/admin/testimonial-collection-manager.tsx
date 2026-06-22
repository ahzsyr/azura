"use client";

import Link from "next/link";
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
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquareQuote } from "lucide-react";
import { useState, useTransition } from "react";
import type { TestimonialCollectionAdmin } from "@/features/testimonials/types";
import {
  deleteTestimonialCollection,
  reorderTestimonialCollections,
  toggleTestimonialCollectionPublished,
} from "@/features/testimonials/actions";
import { AdminCardGrid } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  collections: TestimonialCollectionAdmin[];
};

function SortableCollectionCard({
  collection,
  onChanged,
}: {
  collection: TestimonialCollectionAdmin;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: collection.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const togglePublished = () => {
    startTransition(async () => {
      await toggleTestimonialCollectionPublished(collection.id, !collection.isPublished);
      onChanged();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete collection "${collection.displayTitle}"? Members will be unlinked, not deleted.`)) return;
    startTransition(async () => {
      await deleteTestimonialCollection(collection.id);
      onChanged();
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-xl border bg-card overflow-hidden", isDragging && "opacity-50")}
    >
      <div className="relative aspect-video bg-muted">
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <MessageSquareQuote className="h-10 w-10 opacity-40" />
        </div>
        <button
          type="button"
          className="absolute start-2 top-2 cursor-grab touch-none rounded-md bg-background/80 p-1"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{collection.displayTitle}</h3>
            {!collection.isPublished && (
              <Badge variant="secondary" className="text-[10px]">
                Hidden
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {collection.slug} · {collection.itemCount} testimonial
            {collection.itemCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button asChild size="sm">
            <Link href={`/admin/testimonials/collections/${collection.id}`}>Manage</Link>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={togglePublished} disabled={pending}>
            {collection.isPublished ? "Hide" : "Show"}
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TestimonialCollectionManager({ collections: initial }: Props) {
  const [collections, setCollections] = useState(initial);
  const [pending, startTransition] = useTransition();

  const refreshFromServer = () => {
    startTransition(() => {
      window.location.reload();
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = collections.findIndex((c) => c.id === active.id);
    const newIndex = collections.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(collections, oldIndex, newIndex);
    setCollections(reordered);
    startTransition(async () => {
      await reorderTestimonialCollections(reordered.map((c) => c.id));
    });
  };

  if (collections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <MessageSquareQuote className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 font-medium">No collections yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Group testimonials for homepage blocks and curated sections.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/testimonials/collections/new">New collection</Link>
        </Button>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={collections.map((c) => c.id)} strategy={rectSortingStrategy}>
        <AdminCardGrid columns={3} className={cn(pending && "opacity-80")}>
          {collections.map((collection) => (
            <SortableCollectionCard key={collection.id} collection={collection} onChanged={refreshFromServer} />
          ))}
        </AdminCardGrid>
      </SortableContext>
    </DndContext>
  );
}
