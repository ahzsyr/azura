"use client";

import { useMemo, type ReactNode } from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, LayoutPanelTop, PanelBottom, ShoppingBag } from "lucide-react";
import {
  PRODUCT_PAGE_ELEMENT_LABELS,
  PRODUCT_PAGE_MAIN_ORDER_KEYS,
  PRODUCT_PAGE_SIDE_ORDER_KEYS,
} from "@/features/products/lib/product-page-display";
import type { ProductPageBuilderStudio } from "./use-product-page-builder-studio";
import {
  PRODUCT_PAGE_BUILDER_BLOCKS,
  type BuilderBlockId,
  getBuilderBlock,
  isDisplayKey,
} from "./product-page-block-registry";
import { cn } from "@/lib/utils";

function blockLabel(id: string): string {
  const fromRegistry = getBuilderBlock(id as BuilderBlockId)?.label;
  if (fromRegistry) return fromRegistry;
  const fromDisplay = PRODUCT_PAGE_ELEMENT_LABELS[id as keyof typeof PRODUCT_PAGE_ELEMENT_LABELS];
  return fromDisplay ?? id;
}

function SortableCanvasRow({
  id,
  label,
  enabled,
  onToggle,
}: {
  id: string;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("ppb-structure-row", !enabled && "is-hidden", isDragging && "is-dragging")}
    >
      <span className="ppb-structure-row__label">{label}</span>
      <button
        type="button"
        className="ppb-structure-row__handle"
        aria-label={`Drag ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn("ppb-structure-row__visibility", enabled && "is-visible")}
        aria-label={enabled ? `Hide ${label}` : `Show ${label}`}
        onClick={onToggle}
      >
        {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

function StaticStructureRow({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn("ppb-structure-row ppb-structure-row--static", !enabled && "is-hidden")}>
      <span className="ppb-structure-row__label">{label}</span>
      <span className="ppb-structure-row__meta">Fixed</span>
      <button
        type="button"
        className={cn("ppb-structure-row__visibility", enabled && "is-visible")}
        aria-label={enabled ? `Hide ${label}` : `Show ${label}`}
        onClick={onToggle}
      >
        {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

function StructureZone({
  title,
  description,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  description: string;
  icon: typeof LayoutPanelTop;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="ppb-structure-zone">
      <header className="ppb-structure-zone__head">
        <div className="ppb-structure-zone__icon" aria-hidden>
          <Icon className="h-5 w-5" />
        </div>
        <div className="ppb-structure-zone__copy">
          <h3 className="ppb-structure-zone__title">{title}</h3>
          <p className="ppb-structure-zone__desc">{description}</p>
        </div>
        <span className="ppb-structure-zone__count">{count}</span>
      </header>
      <div className="ppb-structure-zone__columns">
        <span>Block</span>
        <span className="ppb-structure-zone__col-order">Order</span>
        <span>Visible</span>
      </div>
      <div className="ppb-structure-zone__list">{children}</div>
    </section>
  );
}

function useOrderedKeys(order: string[], keys: readonly string[]) {
  return useMemo(() => {
    const ordered = order.filter((k) => keys.includes(k));
    for (const k of keys) {
      if (!ordered.includes(k)) ordered.push(k);
    }
    return ordered;
  }, [order, keys]);
}

export function ProductPageStructureCanvas({ studio }: { studio: ProductPageBuilderStudio }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const layer = studio.activeElementsLayer;
  const mainOrder = useOrderedKeys(layer.elementOrder.main, PRODUCT_PAGE_MAIN_ORDER_KEYS);
  const sideOrder = useOrderedKeys(layer.elementOrder.side, PRODUCT_PAGE_SIDE_ORDER_KEYS);

  const structureBlocks = PRODUCT_PAGE_BUILDER_BLOCKS.filter((b) => b.zone === "structure");

  const isEnabled = (id: BuilderBlockId) => {
    if (!isDisplayKey(id)) return false;
    return layer.display[id]?.enabled !== false;
  };

  const handleMainDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = mainOrder.indexOf(String(active.id));
    const newIndex = mainOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...mainOrder];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    studio.reorderMain(next);
  };

  const handleSideDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sideOrder.indexOf(String(active.id));
    const newIndex = sideOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...sideOrder];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    studio.reorderSide(next);
  };

  const viewportLabel =
    studio.viewport === "desktop" ? "desktop" : studio.viewport === "tablet" ? "tablet" : "mobile";

  return (
    <div className="ppb-structure">
      <header className="ppb-structure__intro">
        <h3 className="ppb-structure__title">Page structure</h3>
        <p className="ppb-structure__desc">
          Reorder and show or hide blocks for <strong>{viewportLabel}</strong>. Switch to Components to
          edit styling and layout settings.
        </p>
      </header>

      <div className="ppb-structure__grid">
        <StructureZone
          title="Page structure"
          description="Hero area — gallery and buy box column"
          icon={LayoutPanelTop}
          count={structureBlocks.length}
        >
          {structureBlocks.map((block) => (
            <StaticStructureRow
              key={block.id}
              label={block.label}
              enabled={isEnabled(block.id)}
              onToggle={() => studio.toggleBlockVisibility(block.id, !isEnabled(block.id))}
            />
          ))}
        </StructureZone>

        <StructureZone
          title="Buy box contents"
          description="Elements inside the purchase column"
          icon={ShoppingBag}
          count={sideOrder.length}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSideDragEnd}>
            <SortableContext items={sideOrder} strategy={verticalListSortingStrategy}>
              {sideOrder.map((key) => (
                <SortableCanvasRow
                  key={key}
                  id={key}
                  label={blockLabel(key)}
                  enabled={isEnabled(key as BuilderBlockId)}
                  onToggle={() =>
                    studio.toggleBlockVisibility(key as BuilderBlockId, !isEnabled(key as BuilderBlockId))
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        </StructureZone>

        <StructureZone
          title="Below the fold"
          description="Tabs, reviews, and merchandising blocks"
          icon={PanelBottom}
          count={mainOrder.length}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMainDragEnd}>
            <SortableContext items={mainOrder} strategy={verticalListSortingStrategy}>
              {mainOrder.map((key) => (
                <SortableCanvasRow
                  key={key}
                  id={key}
                  label={blockLabel(key)}
                  enabled={isEnabled(key as BuilderBlockId)}
                  onToggle={() =>
                    studio.toggleBlockVisibility(key as BuilderBlockId, !isEnabled(key as BuilderBlockId))
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        </StructureZone>
      </div>
    </div>
  );
}
