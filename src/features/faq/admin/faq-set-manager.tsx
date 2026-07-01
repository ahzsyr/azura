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
import { GripVertical, HelpCircle } from "lucide-react";
import { useState, useTransition } from "react";
import type { FaqSetAdmin } from "@/features/faq/types";
import { deleteFaqSet, reorderFaqSets, toggleFaqSetPublished } from "@/features/faq/actions";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  faqSets: FaqSetAdmin[];
};

function SortableFaqSetCard({
  faqSet,
  onChanged,
}: {
  faqSet: FaqSetAdmin;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: faqSet.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const togglePublished = () => {
    startTransition(async () => {
      await toggleFaqSetPublished(faqSet.id, !faqSet.isPublished);
      onChanged();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete FAQ set "${faqSet.displayTitle}" and all its items?`)) return;
    startTransition(async () => {
      await deleteFaqSet(faqSet.id);
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
          <HelpCircle className="h-10 w-10 opacity-40" />
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
            <h3 className="font-medium">{faqSet.displayTitle}</h3>
            {!faqSet.isPublished && (
              <Badge variant="secondary" className="text-[10px]">
                Hidden
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            /faq/{faqSet.slug} · {faqSet.itemCount} item{faqSet.itemCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          <Button asChild size="sm">
            <Link href={`/admin/faqs/${faqSet.id}`}>Manage</Link>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={togglePublished} disabled={pending}>
            {faqSet.isPublished ? "Hide" : "Show"}
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FaqSetManager({ faqSets: initialFaqSets }: Props) {
  const [faqSets, setFaqSets] = useState(initialFaqSets);
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
    const oldIndex = faqSets.findIndex((s) => s.id === active.id);
    const newIndex = faqSets.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(faqSets, oldIndex, newIndex);
    setFaqSets(reordered);
    startTransition(async () => {
      await reorderFaqSets(reordered.map((s) => s.id));
    });
  };

  return (
    <div>
      <AdminPageHeader
        title="FAQ Sets"
        description="Create FAQ collections and manage questions inside each set."
        actions={
          <Button asChild>
            <Link href="/admin/faqs/new">Add FAQ Set</Link>
          </Button>
        }
      />

      {faqSets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No FAQ sets yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first FAQ set to start adding questions.</p>
          <Button asChild className="mt-4">
            <Link href="/admin/faqs/new">Add FAQ Set</Link>
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={faqSets.map((s) => s.id)} strategy={rectSortingStrategy}>
            <AdminCardGrid columns={3} className={cn(pending && "opacity-80")}>
              {faqSets.map((faqSet) => (
                <SortableFaqSetCard key={faqSet.id} faqSet={faqSet} onChanged={refreshFromServer} />
              ))}
            </AdminCardGrid>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
