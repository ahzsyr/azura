"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { MenuItem } from "@/features/navigation/types";
import { SortableTreeItem, type DensityMode } from "./SortableTreeItem";

type Props = {
  filteredTree: MenuItem[];
  flatCount: number;
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  activeInspectorId: string | null;
  density: DensityMode;
  onDragEnd: (event: DragEndEvent) => void;
  onSelectAll: () => void;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onSelectInspector: (id: string) => void;
  onOpenModalEdit: (id: string) => void;
  onOpenAddChild: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onToggleBranch: (id: string) => void;
  onDuplicateItem?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
};

export function MenuTreePanel({
  filteredTree,
  flatCount,
  expandedIds,
  selectedIds,
  activeInspectorId,
  density,
  onDragEnd,
  onSelectAll,
  onToggleExpand,
  onToggleSelect,
  onSelectInspector,
  onOpenModalEdit,
  onOpenAddChild,
  onDeleteItem,
  onToggleBranch,
  onDuplicateItem,
  onToggleVisibility,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <div className="mb-tree-panel space-y-3">
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-xs">
        <span>{flatCount} total items</span>
        <button type="button" className="underline underline-offset-2" onClick={onSelectAll}>
          Select all
        </button>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-xl border p-2">
        {filteredTree.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No matching items found.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={filteredTree.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {filteredTree.map((item) => (
                  <SortableTreeItem
                    key={item.id}
                    item={item}
                    level={0}
                    expandedIds={expandedIds}
                    selectedIds={selectedIds}
                    activeInspectorId={activeInspectorId}
                    density={density}
                    onToggleExpand={onToggleExpand}
                    onToggleSelect={onToggleSelect}
                    onSelectInspector={onSelectInspector}
                    onOpenModalEdit={onOpenModalEdit}
                    onOpenAddChild={onOpenAddChild}
                    onDeleteItem={onDeleteItem}
                    onToggleBranch={onToggleBranch}
                    onDuplicateItem={onDuplicateItem}
                    onToggleVisibility={onToggleVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
