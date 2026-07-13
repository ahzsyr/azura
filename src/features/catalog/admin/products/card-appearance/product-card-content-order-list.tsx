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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ProductCardContentSlot } from "@/features/products/card-design/product-card-design.types";
import { DEFAULT_CONTENT_ORDER } from "@/features/products/card-design/product-card-design.types";

const SLOT_LABELS: Record<ProductCardContentSlot, string> = {
  brand: "Brand",
  category: "Category",
  title: "Title",
  badges: "Badges",
  description: "Short description",
  features: "Feature tags",
  price: "Price",
  rating: "Rating",
  stock: "Stock",
  actions: "Actions",
};

function SortableRow({ id }: { id: ProductCardContentSlot }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`pca-order-item${isDragging ? " is-dragging" : ""}`}
    >
      <button type="button" className="pca-order-item__handle" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" aria-hidden />
        <span className="sr-only">Drag to reorder</span>
      </button>
      <span>{SLOT_LABELS[id] ?? id}</span>
    </li>
  );
}

export function ProductCardContentOrderList({
  order,
  onChange,
}: {
  order: ProductCardContentSlot[];
  onChange: (order: ProductCardContentSlot[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as ProductCardContentSlot);
    const newIndex = order.indexOf(over.id as ProductCardContentSlot);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(order, oldIndex, newIndex));
  };

  return (
    <div className="pca-order">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="pca-order__list">
            {order.map((slot) => (
              <SortableRow key={slot} id={slot} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        className="apm-btn-ghost"
        onClick={() => onChange([...DEFAULT_CONTENT_ORDER])}
      >
        Reset order
      </button>
    </div>
  );
}
