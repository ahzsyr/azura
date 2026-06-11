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
import type { SearchFiltersSettings } from "@/features/search/settings/admin-search-settings.schema";
import type { DiscoveredCustomSearchFilter } from "@/features/search/settings/discover-search-filters";
import {
  BUILTIN_SEARCH_FILTER_DESCRIPTIONS,
  BUILTIN_SEARCH_FILTER_LABELS,
  BUILTIN_SEARCH_FILTER_IDS,
  isBuiltinFilterId,
  type SearchBuiltinFilterId,
} from "@/features/search/settings/search-filter-keys";
import { ToggleField } from "@/features/search/admin/search-settings-fields";
import { cn } from "@/lib/utils";

type FilterRow = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  isCustom: boolean;
};

type Props = {
  filters: SearchFiltersSettings;
  discoveredCustom: DiscoveredCustomSearchFilter[];
  onDisplayOrderChange: (order: string[]) => void;
  onBuiltinEnabledChange: (id: SearchBuiltinFilterId, enabled: boolean) => void;
  onCustomEnabledChange: (id: string, enabled: boolean) => void;
  onShowEntityTypeChipsChange: (v: boolean) => void;
};

function SortableFilterRow({
  id,
  label,
  description,
  enabled,
  onEnabledChange,
}: {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
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
      <div className="min-w-0 flex-1">
        <ToggleField
          label={label}
          description={description}
          checked={enabled}
          onChange={onEnabledChange}
        />
      </div>
    </div>
  );
}

export function SearchFiltersPanel({
  filters,
  discoveredCustom,
  onDisplayOrderChange,
  onBuiltinEnabledChange,
  onCustomEnabledChange,
  onShowEntityTypeChipsChange,
}: Props) {
  const order = filters.displayOrder.length
    ? filters.displayOrder
    : [...BUILTIN_SEARCH_FILTER_IDS];

  const rows: FilterRow[] = order
    .map((id) => {
      if (isBuiltinFilterId(id)) {
        return {
          id,
          label: BUILTIN_SEARCH_FILTER_LABELS[id],
          description: BUILTIN_SEARCH_FILTER_DESCRIPTIONS[id],
          enabled: filters.builtin[id]?.enabled ?? true,
          isCustom: false,
        };
      }
      const cfg = filters.customFields[id];
      const discovered = discoveredCustom.find((d) => d.id === id);
      if (!cfg && !discovered) return null;
      return {
        id,
        label: cfg
          ? `${cfg.labelEn} (${cfg.contentTypeSlug})`
          : `${discovered!.labelEn} (${discovered!.contentTypeSlug})`,
        description: `Custom field · ${cfg?.fieldKey ?? discovered!.fieldKey}`,
        enabled: cfg?.enabled ?? true,
        isCustom: true,
      };
    })
    .filter((r): r is FilterRow => r != null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = rows.map((r) => r.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onDisplayOrderChange(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      <ToggleField
        label="Entity type chips"
        description="Prisma entity groups (products, pages, posts, catalog items, …) in the search modal."
        checked={filters.showEntityTypeChips}
        onChange={onShowEntityTypeChipsChange}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {rows.map((row) => (
              <SortableFilterRow
                key={row.id}
                id={row.id}
                label={row.label}
                description={row.description}
                enabled={row.enabled}
                onEnabledChange={(v) =>
                  row.isCustom
                    ? onCustomEnabledChange(row.id, v)
                    : onBuiltinEnabledChange(row.id as SearchBuiltinFilterId, v)
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
