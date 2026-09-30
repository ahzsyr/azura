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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ToggleField } from "@/components/admin/settings-fields";
import { Button } from "@/components/ui/button";
import { PopupListItem } from "@/features/popups/admin/PopupListItem";
import {
  getPopupAdminStatus,
  type PopupLibraryFilter,
} from "@/features/popups/admin/lib/popup-status";
import type { PopupItem } from "@/features/popups/popup.schema";
import type { SitePopupsSettings } from "@/features/popups/site-popups.schema";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ id: PopupLibraryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "draft", label: "Drafts" },
];

type Props = {
  settings: SitePopupsSettings;
  onSystemEnabledChange: (enabled: boolean) => void;
  onReorder: (items: PopupItem[]) => void;
  onEdit: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
};

export function PopupLibrary({
  settings,
  onSystemEnabledChange,
  onReorder,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
  onCreate,
}: Props) {
  const [filter, setFilter] = useState<PopupLibraryFilter>("all");
  const [query, setQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return settings.items.filter((item) => {
      const status = getPopupAdminStatus(item);
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.type.toLowerCase().includes(q);
    });
  }, [settings.items, filter, query]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = settings.items.findIndex((item) => item.id === active.id);
    const newIndex = settings.items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(settings.items, oldIndex, newIndex));
  };

  return (
    <div className="popup-admin-library space-y-5">
      <div className="popup-admin-library__header">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Marketing Popups</h2>
          <p className="text-sm text-muted-foreground">
            Create announcements, promotions, and campaigns
          </p>
        </div>
        <Button type="button" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Popup
        </Button>
      </div>

      <ToggleField
        label="Enable popup management system"
        checked={settings.enabled}
        onChange={onSystemEnabledChange}
      />

      <div className="popup-admin-library__toolbar">
        <div className="popup-admin-filter-tabs" role="tablist" aria-label="Filter popups">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={filter === entry.id}
              className={cn("popup-admin-filter-tab", filter === entry.id && "is-selected")}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <label className="popup-admin-search">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search popups"
          />
        </label>
      </div>

      {settings.items.length === 0 ? (
        <div className="popup-admin-empty">
          <p className="text-sm font-medium">No popups yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first modal, slide-in, promo, or floating button.
          </p>
          <Button type="button" className="mt-3" onClick={onCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Popup
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No popups match this filter.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filteredItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <PopupListItem
                  key={item.id}
                  item={item}
                  onEdit={() => onEdit(item.id)}
                  onToggle={(enabled) => onToggle(item.id, enabled)}
                  onDuplicate={() => onDuplicate(item.id)}
                  onDelete={() => onDelete(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
