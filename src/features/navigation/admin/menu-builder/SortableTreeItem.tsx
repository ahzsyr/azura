"use client";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Pen,
  Plus,
  Trash2,
} from "lucide-react";
import type { MenuItem, MenuItemVisibility } from "@/features/navigation/types";
import { getItemSubtitle } from "@/features/navigation/menu-engine";
import { useHeaderBuilderCatalog } from "../HeaderBuilderCatalogContext";
import { layoutLabel } from "../shared/flyout-layout-labels";
import { MenuItemIconPreview } from "../shared/MenuItemIconPreview";
import { resolveMenuItemPreviewImage } from "../shared/resolve-menu-item-preview-image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DensityMode = "comfortable" | "compact" | "ultra";

export const DENSITY_CLASSES: Record<DensityMode, string> = {
  comfortable: "gap-2 p-3",
  compact: "gap-1.5 p-2.5",
  ultra: "gap-1 p-2",
};

function placementLabel(placement: MenuItem["placement"]) {
  if (placement === "both") return "Both";
  if (placement === "desktop") return "Desktop";
  return "Mobile";
}

function visibilityLabel(status: MenuItemVisibility | undefined) {
  const value = status ?? "visible";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SortableTreeItem({
  item,
  level,
  expandedIds,
  selectedIds,
  activeInspectorId,
  density,
  onToggleExpand,
  onToggleSelect,
  onSelectInspector,
  onOpenModalEdit,
  onOpenAddChild,
  onDeleteItem,
  onToggleBranch,
  onDuplicateItem,
  onToggleVisibility,
}: {
  item: MenuItem;
  level: number;
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  activeInspectorId: string | null;
  density: DensityMode;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onSelectInspector: (id: string) => void;
  onOpenModalEdit: (id: string) => void;
  onOpenAddChild: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onToggleBranch: (id: string) => void;
  onDuplicateItem?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
}) {
  const { catalog } = useHeaderBuilderCatalog();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const hasChildren = (item.children?.length ?? 0) > 0;
  const expanded = expandedIds.has(item.id);
  const selected = selectedIds.has(item.id);
  const isEditing = activeInspectorId === item.id;
  const childCount = item.children?.length ?? 0;
  const layout = item.megaMenuType ? layoutLabel(item.megaMenuType) : null;
  const hidden = (item.visibility ?? "visible") === "hidden";
  const previewImage = resolveMenuItemPreviewImage(item, catalog);

  return (
    <div ref={setNodeRef} style={style} className={cn("space-y-1", isDragging && "opacity-60")}>
      <div
        className={cn(
          "mb-tree-row group rounded-xl border bg-card/80 backdrop-blur-sm transition-all",
          DENSITY_CLASSES[density],
          selected && "border-primary/40 ring-1 ring-primary/20",
          isEditing && "mb-tree-row--active border-primary bg-primary/5 ring-2 ring-primary/40",
        )}
        style={{ marginLeft: level * 14 }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Drag item"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggleSelect(item.id, e.target.checked)}
            aria-label={`Select ${item.label} for bulk actions`}
            className="shrink-0"
          />
          {hasChildren ? (
            <button
              type="button"
              className="rounded p-1 hover:bg-muted"
              onClick={() => onToggleExpand(item.id)}
              aria-label={expanded ? "Collapse branch" : "Expand branch"}
              aria-expanded={expanded}
            >
              <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
            </button>
          ) : (
            <span className="w-6" />
          )}
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => onSelectInspector(item.id)}
          >
            <MenuItemIconPreview icon={item.icon} imageUrl={previewImage} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.label || "Untitled"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.type}
                {" · "}
                {placementLabel(item.placement)}
                {" · "}
                {visibilityLabel(item.visibility)}
                {childCount > 0 ? ` · ${childCount} children` : ""}
                {layout ? ` · ${layout}` : ""}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onOpenModalEdit(item.id)}
              title="Edit"
            >
              <Pen className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onOpenAddChild(item.id)}
              title="Add child"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="More">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpenModalEdit(item.id)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenAddChild(item.id)}>Add child</DropdownMenuItem>
                {onDuplicateItem ? (
                  <DropdownMenuItem onClick={() => onDuplicateItem(item.id)}>Duplicate</DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => onToggleBranch(item.id)}>Select branch</DropdownMenuItem>
                {onToggleVisibility ? (
                  <DropdownMenuItem onClick={() => onToggleVisibility(item.id)}>
                    {hidden ? (
                      <>
                        <Eye className="me-2 h-3.5 w-3.5" /> Show
                      </>
                    ) : (
                      <>
                        <EyeOff className="me-2 h-3.5 w-3.5" /> Hide
                      </>
                    )}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteItem(item.id)}
                >
                  <Trash2 className="me-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
                {onDuplicateItem ? (
                  <DropdownMenuItem className="hidden" onClick={() => onDuplicateItem(item.id)}>
                    <Copy className="me-2 h-3.5 w-3.5" /> Duplicate
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* keep subtitle helper available for screen readers / future */}
        <span className="sr-only">{getItemSubtitle(item)}</span>
      </div>
      {hasChildren && expanded ? (
        <SortableContext items={item.children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {item.children.map((child) => (
              <SortableTreeItem
                key={child.id}
                item={child}
                level={level + 1}
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
      ) : null}
    </div>
  );
}
