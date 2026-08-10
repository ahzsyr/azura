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
import { useCallback, useRef, useState } from "react";
import { ToggleField } from "@/components/admin/settings-fields";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import {
  PRODUCT_LISTING_FILTER_SECTION_DESCRIPTIONS,
  PRODUCT_LISTING_FILTER_SECTION_LABELS,
  type ProductListingFilterSectionId,
} from "@/features/products/listing/product-listing-filter-keys";
import type { ProductListingFilterSettings } from "@/features/products/listing/product-listing-filters.schema";
import { useDesignHubSettingsActions } from "@/hooks/use-design-hub-settings-actions";
import { cn } from "@/lib/utils";

type Props = {
  initialSettings: ProductListingFilterSettings;
};

function SortableFilterRow({
  id,
  label,
  description,
  enabled,
  onEnabledChange,
  disabled = false,
}: {
  id: ProductListingFilterSectionId;
  label: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-3 rounded-lg border bg-card p-3",
        isDragging && "opacity-60 shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none self-center shrink-0"
        disabled={disabled}
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
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function ProductListingFiltersAdminPanel({ initialSettings }: Props) {
  const [settings, setSettings] = useState<ProductListingFilterSettings>(initialSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedSettingsRef = useRef(initialSettings);

  const handleSave = useCallback(async () => {
    setStatus(null);
    setError(null);
    const res = await fetch("/api/save-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "productListingFilters",
        value: settings,
        locale: adminLocale.code,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      const message = data.error ?? "Save failed";
      setError(message);
      throw new Error(message);
    }
    savedSettingsRef.current = settings;
    setStatus("Product listing filter settings saved.");
  }, [settings]);

  const handleCancel = useCallback(() => {
    setSettings(savedSettingsRef.current);
    setStatus(null);
    setError(null);
  }, []);

  const { markDirty } = useDesignHubSettingsActions({
    onSave: handleSave,
    onCancel: handleCancel,
    saveLabel: "Save",
    publishEntityType: "site-settings",
    loadPublishStatus: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = settings.displayOrder;
    const oldIndex = ids.indexOf(String(active.id) as ProductListingFilterSectionId);
    const newIndex = ids.indexOf(String(over.id) as ProductListingFilterSectionId);
    if (oldIndex < 0 || newIndex < 0) return;
    markDirty();
    setSettings((prev) => ({
      ...prev,
      displayOrder: arrayMove(prev.displayOrder, oldIndex, newIndex),
    }));
  };

  const setVisible = (id: ProductListingFilterSectionId, enabled: boolean) => {
    markDirty();
    setSettings((prev) => ({
      ...prev,
      visibility: { ...prev.visibility, [id]: enabled },
    }));
  };

  const showSidebar = settings.showSidebar !== false;

  return (
    <div className="space-y-4">
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-sm text-muted-foreground max-w-2xl">
        Control which filters are available in the product catalog sidebar. Filters that are
        enabled but have no available options will continue to be hidden automatically.
      </p>

      <ToggleField
        label="Show filters sidebar"
        description="Show the left filter panel on desktop and the Filters button/drawer on mobile for all catalog listing pages (products, categories, brands, tags)."
        checked={showSidebar}
        onChange={(v) => {
          markDirty();
          setSettings((prev) => ({ ...prev, showSidebar: v }));
        }}
      />

      <div
        className={cn(!showSidebar && "pointer-events-none opacity-50")}
        aria-disabled={!showSidebar}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={showSidebar ? onDragEnd : undefined}
        >
          <SortableContext items={settings.displayOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {settings.displayOrder.map((id) => (
                <SortableFilterRow
                  key={id}
                  id={id}
                  label={PRODUCT_LISTING_FILTER_SECTION_LABELS[id]}
                  description={PRODUCT_LISTING_FILTER_SECTION_DESCRIPTIONS[id]}
                  enabled={settings.visibility[id]}
                  onEnabledChange={(v) => setVisible(id, v)}
                  disabled={!showSidebar}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
