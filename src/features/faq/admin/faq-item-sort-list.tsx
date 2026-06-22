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
import { GripVertical, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type RefObject } from "react";
import type { FaqItemAdmin } from "@/features/faq/types";
import { deleteFaqItem, reorderFaqItems, toggleFaqItemPublished } from "@/features/faq/actions";
import { FaqItemEditPanel } from "./faq-item-edit-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  faqSetId: string;
  items: FaqItemAdmin[];
  editingItemId?: string | null;
  onEditingItemChange?: (id: string | null) => void;
  itemFormRef?: RefObject<HTMLFormElement | null>;
};

function SortableFaqRow({
  item,
  faqSetId,
  expanded,
  onToggleExpand,
  itemFormRef,
}: {
  item: FaqItemAdmin;
  faqSetId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  itemFormRef?: RefObject<HTMLFormElement | null>;
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
      await toggleFaqItemPublished(item.id, !item.isPublished);
      refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${item.questionEn}"?`)) return;
    startTransition(async () => {
      await deleteFaqItem(item.id);
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

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium truncate">{item.questionEn}</p>
            {!item.isPublished && (
              <Badge variant="secondary" className="text-[10px]">
                Hidden
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.answerEn}</p>
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
        <FaqItemEditPanel
          item={item}
          faqSetId={faqSetId}
          onClose={onToggleExpand}
          embedded
          formRef={expanded ? itemFormRef : undefined}
        />
      )}
    </div>
  );
}

export function FaqItemSortList({
  faqSetId,
  items,
  editingItemId = null,
  onEditingItemChange,
  itemFormRef,
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
      await reorderFaqItems(
        faqSetId,
        reordered.map((i) => i.id)
      );
      router.refresh();
    });
  };

  const toggleExpand = (itemId: string) => {
    const next = editingItemId === itemId ? null : itemId;
    onEditingItemChange?.(next);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No FAQs yet. Use the Add FAQ tab to add questions and answers.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={cn("space-y-2", pending && "opacity-70")}>
          {items.map((item) => (
            <SortableFaqRow
              key={item.id}
              item={item}
              faqSetId={faqSetId}
              expanded={editingItemId === item.id}
              onToggleExpand={() => toggleExpand(item.id)}
              itemFormRef={editingItemId === item.id ? itemFormRef : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
