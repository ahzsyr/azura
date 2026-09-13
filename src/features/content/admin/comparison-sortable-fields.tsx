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
import type { ContentFieldDefinition } from "@/features/content/types";
import { cn } from "@/lib/utils";

type Props = {
  fieldSchema: ContentFieldDefinition[];
  onFieldSchemaChange: (fields: ContentFieldDefinition[]) => void;
  renderFieldEditor: (field: ContentFieldDefinition, index: number) => React.ReactNode;
};

function SortableFieldRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex gap-2 items-start", isDragging && "opacity-60")}
    >
      <button
        type="button"
        className="cursor-grab touch-none mt-3 shrink-0"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function ComparisonSortableFields({
  fieldSchema,
  onFieldSchemaChange,
  renderFieldEditor,
}: Props) {
  const compareIndices = fieldSchema
    .map((f, i) => (f.compare ? i : -1))
    .filter((i) => i >= 0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldOrder = compareIndices.map((i) => `field-${i}`);
    const oldIndex = oldOrder.indexOf(String(active.id));
    const newIndex = oldOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedCompareIndices = arrayMove(compareIndices, oldIndex, newIndex);
    const next = [...fieldSchema];
    reorderedCompareIndices.forEach((fieldIndex, order) => {
      next[fieldIndex] = {
        ...next[fieldIndex],
        compareOrder: order * 10,
      };
    });
    onFieldSchemaChange(next);
  };

  if (compareIndices.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={compareIndices.map((i) => `field-${i}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {compareIndices.map((index) => (
            <SortableFieldRow key={`field-${index}`} id={`field-${index}`}>
              {renderFieldEditor(fieldSchema[index], index)}
            </SortableFieldRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
