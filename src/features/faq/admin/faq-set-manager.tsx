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
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, HelpCircle, LayoutGrid, Table } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { PublicLocale } from "@/i18n/locale-config";
import type { FaqSetAdmin } from "@/features/faq/types";
import { deleteFaqSet, reorderFaqSets, toggleFaqSetPublished } from "@/features/faq/actions";
import { FaqSetCreateModal } from "./faq-set-create-modal";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEW_STORAGE_KEY = "admin-faq-sets-view";

type ViewMode = "card" | "table";

type Props = {
  faqSets: FaqSetAdmin[];
  locales: PublicLocale[];
  initialCreateOpen?: boolean;
};

function FaqSetActions({
  faqSet,
  onChanged,
  pending,
}: {
  faqSet: FaqSetAdmin;
  onChanged: () => void;
  pending: boolean;
}) {
  const [actionPending, startTransition] = useTransition();

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

  const disabled = pending || actionPending;

  return (
    <div className="flex flex-wrap gap-1">
      <Button asChild size="sm">
        <Link href={`/admin/faqs/${faqSet.id}`}>Manage</Link>
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={togglePublished} disabled={disabled}>
        {faqSet.isPublished ? "Hide" : "Show"}
      </Button>
      <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={disabled}>
        Delete
      </Button>
    </div>
  );
}

function SortableFaqSetCard({
  faqSet,
  onChanged,
  pending,
}: {
  faqSet: FaqSetAdmin;
  onChanged: () => void;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: faqSet.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-xl border bg-card overflow-hidden", isDragging && "opacity-50")}
    >
      <div className="relative aspect-video bg-muted">
        {faqSet.coverUrl ? (
          <img
            src={faqSet.coverUrl}
            alt={faqSet.displayTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <HelpCircle className="h-10 w-10 opacity-40" />
          </div>
        )}
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

        <FaqSetActions faqSet={faqSet} onChanged={onChanged} pending={pending} />
      </div>
    </div>
  );
}

function SortableFaqSetTableRow({
  faqSet,
  onChanged,
  pending,
}: {
  faqSet: FaqSetAdmin;
  onChanged: () => void;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: faqSet.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className={cn("border-t align-middle", isDragging && "opacity-50")}>
      <td className="px-4 py-3">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {faqSet.coverUrl ? (
            <img src={faqSet.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <HelpCircle className="h-4 w-4 text-muted-foreground opacity-50" />
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{faqSet.displayTitle}</span>
          {!faqSet.isPublished && (
            <Badge variant="secondary" className="text-[10px]">
              Hidden
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">/faq/{faqSet.slug}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {faqSet.itemCount} item{faqSet.itemCount === 1 ? "" : "s"}
      </td>
      <td className="px-4 py-3">
        <FaqSetActions faqSet={faqSet} onChanged={onChanged} pending={pending} />
      </td>
    </tr>
  );
}

function ViewModeToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-1" role="group" aria-label="View mode">
      <Button
        type="button"
        size="icon"
        variant={viewMode === "card" ? "secondary" : "ghost"}
        className="h-8 w-8"
        onClick={() => onChange("card")}
        aria-pressed={viewMode === "card"}
        title="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={viewMode === "table" ? "secondary" : "ghost"}
        className="h-8 w-8"
        onClick={() => onChange("table")}
        aria-pressed={viewMode === "table"}
        title="Table view"
      >
        <Table className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FaqSetManager({ faqSets: initialFaqSets, locales, initialCreateOpen = false }: Props) {
  const [faqSets, setFaqSets] = useState(initialFaqSets);
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "card" || stored === "table") setViewMode(stored);
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  };

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
          <div className="flex flex-wrap items-center gap-2">
            {faqSets.length > 0 && (
              <ViewModeToggle viewMode={viewMode} onChange={handleViewModeChange} />
            )}
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Add FAQ Set
            </Button>
          </div>
        }
      />

      {faqSets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No FAQ sets yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first FAQ set to start adding questions.</p>
          <Button type="button" className="mt-4" onClick={() => setCreateOpen(true)}>
            Add FAQ Set
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={faqSets.map((s) => s.id)}
            strategy={viewMode === "card" ? rectSortingStrategy : verticalListSortingStrategy}
          >
            {viewMode === "card" ? (
              <AdminCardGrid columns={3} className={cn(pending && "opacity-80")}>
                {faqSets.map((faqSet) => (
                  <SortableFaqSetCard
                    key={faqSet.id}
                    faqSet={faqSet}
                    onChanged={refreshFromServer}
                    pending={pending}
                  />
                ))}
              </AdminCardGrid>
            ) : (
              <div className={cn("overflow-x-auto rounded-xl border", pending && "opacity-80")}>
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="w-10 px-4 py-3 font-medium" aria-label="Reorder" />
                      <th className="w-20 px-4 py-3 font-medium">Cover</th>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Items</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faqSets.map((faqSet) => (
                      <SortableFaqSetTableRow
                        key={faqSet.id}
                        faqSet={faqSet}
                        onChanged={refreshFromServer}
                        pending={pending}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SortableContext>
        </DndContext>
      )}

      <FaqSetCreateModal open={createOpen} onOpenChange={setCreateOpen} locales={locales} />
    </div>
  );
}
