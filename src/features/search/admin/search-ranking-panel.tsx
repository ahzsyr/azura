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
import type { SearchRankingSettings } from "@/features/search/settings/admin-search-settings.schema";
import {
  SEARCH_RANKING_SIGNAL_DESCRIPTIONS,
  SEARCH_RANKING_SIGNAL_LABELS,
  type SearchRankingSignalId,
} from "@/features/search/settings/search-ranking-signals";
import { NumberField } from "@/features/search/admin/search-settings-fields";
import { cn } from "@/lib/utils";

type Props = {
  ranking: SearchRankingSettings;
  onPriorityOrderChange: (order: SearchRankingSignalId[]) => void;
  onWeightChange: (signal: SearchRankingSignalId, weight: number) => void;
};

function SortableRankingRow({
  id,
  label,
  description,
  weight,
  onWeightChange,
}: {
  id: string;
  label: string;
  description: string;
  weight: number;
  onWeightChange: (w: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-3 rounded-lg border bg-card p-3",
        isDragging && "opacity-60 shadow-md"
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none self-center shrink-0"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${label}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <NumberField
          label="Weight"
          value={weight}
          min={0}
          max={10}
          step={0.5}
          onChange={onWeightChange}
        />
      </div>
    </div>
  );
}

export function SearchRankingPanel({ ranking, onPriorityOrderChange, onWeightChange }: Props) {
  const order = ranking.priorityOrder;
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as SearchRankingSignalId);
    const newIndex = order.indexOf(over.id as SearchRankingSignalId);
    if (oldIndex < 0 || newIndex < 0) return;
    onPriorityOrderChange(arrayMove(order, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {order.map((signal) => (
            <SortableRankingRow
              key={signal}
              id={signal}
              label={SEARCH_RANKING_SIGNAL_LABELS[signal]}
              description={SEARCH_RANKING_SIGNAL_DESCRIPTIONS[signal]}
              weight={ranking.weights[signal]}
              onWeightChange={(w) => onWeightChange(signal, w)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
