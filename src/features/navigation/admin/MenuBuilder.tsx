"use client";

import { useRef, useState } from "react";
import { useStore } from "@nanostores/react";
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
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderOpen,
  GripVertical,
  Image as ImageIcon,
  Link2,
  Package,
  Pen,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  HeaderBuilderCatalog,
  MenuItem,
  MenuItemType,
  MenuPlacement,
  MenuItemVisibility,
} from "@/features/navigation/types";
import {
  $workspace,
  addChildItem,
  addRootItem,
  deleteMenu,
  duplicateMenu,
  patchWorkspace,
  removeItem,
  renameMenu,
  setActiveMenuKey,
  updateMenuItem,
} from "@/features/navigation/header-store";
import { findItemById, findMenuKeyAssignedToSurface, getItemSubtitle } from "@/features/navigation/menu-engine";
import { getItemHref } from "@/features/navigation/resolve-href";
import { saveWorkspaceToServer } from "@/features/navigation/header-workspace-api";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionButtonGroup, HeaderSelect } from "./header-builder-ui";
import { MenuItemModal, type ModalMode } from "./MenuItemModal";
import { MenuTreeService } from "@/features/navigation/menu-tree-service";
import { MenuAnalyticsService } from "@/features/navigation/menu-analytics-service";
import { MenuValidationService } from "@/features/navigation/menu-validation-service";
import { MenuImportExportService } from "@/features/navigation/menu-import-export-service";
import { MenuTemplateService, type MenuTemplateId } from "@/features/navigation/menu-template-service";
import { useHeaderBuilderCatalog } from "./HeaderBuilderCatalogContext";
import { CollectionSelect, PageSelect, ProductSelect } from "./CatalogSelects";
import { newMenuItemFromForm } from "@/features/navigation/defaults";
import { cn } from "@/lib/utils";

type DensityMode = "comfortable" | "compact" | "ultra";
type QuickAddPlacement = "root" | "child";

function labelForPageSlug(catalog: HeaderBuilderCatalog, pageId: string): string {
  return catalog.pages.find((p) => p.slug === pageId)?.title?.trim() || pageId.trim() || "Page";
}

function labelForCollectionSlug(catalog: HeaderBuilderCatalog, collectionId: string): string {
  return (
    catalog.collections.find((c) => c.slug === collectionId)?.name?.trim() ||
    collectionId.trim() ||
    "Collection"
  );
}

function labelForProductSlug(catalog: HeaderBuilderCatalog, productId: string): string {
  return catalog.products.find((p) => p.slug === productId)?.name?.trim() || productId.trim() || "Product";
}
const DENSITY_CLASSES: Record<DensityMode, string> = {
  comfortable: "gap-2 p-3",
  compact: "gap-1.5 p-2.5",
  ultra: "gap-1 p-2",
};
const DENSITY_STORAGE_KEY = "hb-builder-density";

function typeIconElement(type: MenuItemType) {
  const iconClassName = "h-4 w-4 text-muted-foreground";
  switch (type) {
    case "page":
      return <FileText className={iconClassName} />;
    case "collection":
    case "packageCategory":
      return <FolderOpen className={iconClassName} />;
    case "product":
    case "package":
      return <Package className={iconClassName} />;
    case "image":
      return <ImageIcon className={iconClassName} />;
    case "post":
      return <ShoppingBag className={iconClassName} />;
    default:
      return <Link2 className={iconClassName} />;
  }
}

function placementLabel(placement: MenuItem["placement"]) {
  if (placement === "both") return "Desktop+Mobile";
  if (placement === "desktop") return "Desktop";
  return "Mobile";
}

function visibilityBadge(status: MenuItemVisibility | undefined) {
  const value = status ?? "visible";
  if (value === "visible") return <Badge variant="outline">Visible</Badge>;
  if (value === "hidden") return <Badge variant="secondary">Hidden</Badge>;
  if (value === "draft") return <Badge variant="secondary">Draft</Badge>;
  return <Badge variant="secondary">Scheduled</Badge>;
}

function collectParentIds(items: MenuItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.children?.length) {
      ids.push(item.id, ...collectParentIds(item.children));
    }
  }
  return ids;
}

function cloneMenuItems(items: MenuItem[]): MenuItem[] {
  return JSON.parse(JSON.stringify(items)) as MenuItem[];
}

function SortableTreeItem({
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
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const hasChildren = (item.children?.length ?? 0) > 0;
  const expanded = expandedIds.has(item.id);
  const selected = selectedIds.has(item.id);

  return (
    <div ref={setNodeRef} style={style} className={cn("space-y-1", isDragging && "opacity-60")}>
      <div
        className={cn(
          "rounded-xl border bg-card/80 backdrop-blur-sm transition-all",
          DENSITY_CLASSES[density],
          selected && "border-primary/60 ring-1 ring-primary/30",
          activeInspectorId === item.id && "border-primary",
        )}
        style={{ marginLeft: level * 14 }}
      >
        <div className="flex min-w-0 items-center gap-2">
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
            aria-label={`Select ${item.label}`}
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
            {item.icon?.trim() ? (
              <i className={`fas ${item.icon.trim()} text-sm text-muted-foreground`} aria-hidden />
            ) : (
              typeIconElement(item.type)
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.label || "Untitled"}</p>
              <p className="truncate text-xs text-muted-foreground">{getItemSubtitle(item)}</p>
            </div>
          </button>
          <div className="hidden items-center gap-1 md:flex">
            <Badge variant="secondary" className="text-[10px] uppercase">
              {item.type}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {placementLabel(item.placement)}
            </Badge>
            {visibilityBadge(item.visibility)}
            {hasChildren ? <Badge variant="outline">{item.children.length} children</Badge> : null}
            {item.megaMenuType ? <Badge variant="outline">Mega</Badge> : null}
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" size="icon" variant="ghost" onClick={() => onToggleBranch(item.id)} title="Select branch">
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => onOpenModalEdit(item.id)} title="Advanced edit">
              <Pen className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => onOpenAddChild(item.id)} title="Add child">
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDeleteItem(item.id)}
              title="Delete item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
              />
            ))}
          </div>
        </SortableContext>
      ) : null}
    </div>
  );
}

export function MenuBuilder({ onSwitchToManager }: { onSwitchToManager?: () => void }) {
  const workspace = useStore($workspace);
  const catalog = useHeaderBuilderCatalog();
  const menu = workspace.menusDatabase[workspace.activeMenuKey];
  const adminForm = useAdminFormOptional();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [placement, setPlacement] = useState<MenuPlacement>("both");
  const [statusFilter, setStatusFilter] = useState<"all" | MenuItemVisibility>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [activeInspectorId, setActiveInspectorId] = useState<string | null>(null);
  const [isRenamingMenu, setIsRenamingMenu] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteMenu, setConfirmDeleteMenu] = useState(false);
  const [historyPast, setHistoryPast] = useState<MenuItem[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<MenuItem[][]>([]);
  const [templateId, setTemplateId] = useState<MenuTemplateId>("corporate");
  const [density, setDensity] = useState<DensityMode>(() => {
    if (typeof window === "undefined") return "comfortable";
    const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return saved === "compact" || saved === "ultra" ? saved : "comfortable";
  });
  const [selectedQuickPages, setSelectedQuickPages] = useState<string[]>([]);
  const [quickAddPlacement, setQuickAddPlacement] = useState<QuickAddPlacement>("root");
  const [quickAddSearch, setQuickAddSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const queueSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveWorkspaceToServer();
    }, 350);
  };

  const toast = (type: "success" | "error", message: string) => {
    adminForm?.showToast(message, type);
  };

  if (!menu) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No menu selected. Go to Menu Manager to select or create a menu.</p>
          {onSwitchToManager ? (
            <Button type="button" variant="outline" onClick={onSwitchToManager}>
              Open Menu Manager
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const applyMenuItems = (nextItems: MenuItem[], options?: { pushHistory?: boolean; persist?: boolean }) => {
    const current = workspace.menusDatabase[workspace.activeMenuKey];
    if (!current) return;
    if (options?.pushHistory !== false) {
      setHistoryPast((prev) => [...prev.slice(-40), cloneMenuItems(current.items)]);
      setHistoryFuture([]);
    }
    patchWorkspace({
      menusDatabase: {
        ...workspace.menusDatabase,
        [workspace.activeMenuKey]: { ...current, items: nextItems },
      },
    });
    if (options?.persist !== false) queueSave();
  };

  const undo = () => {
    if (historyPast.length === 0) return;
    const current = cloneMenuItems(menu.items);
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [current, ...prev]);
    applyMenuItems(cloneMenuItems(previous), { pushHistory: false });
  };

  const redo = () => {
    if (historyFuture.length === 0) return;
    const current = cloneMenuItems(menu.items);
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev, current]);
    applyMenuItems(cloneMenuItems(next), { pushHistory: false });
  };

  const allItems = menu.items;
  const analytics = MenuAnalyticsService.getMenuAnalytics(allItems);
  const healthIssues = MenuValidationService.validateMenu(allItems, catalog);
  const flatAll = MenuTreeService.flattenMenuTree(allItems);
  const filteredTree = MenuTreeService.filterTree(allItems, (item) => {
    if (placement !== "both" && item.placement !== placement && item.placement !== "both") return false;
    const vis = item.visibility ?? "visible";
    if (statusFilter !== "all" && vis !== statusFilter) return false;
    return MenuTreeService.searchMatch(item, searchQuery);
  });

  const inspectorItem = activeInspectorId ? findItemById(allItems, activeInspectorId) : null;
  const editingItem = modalItemId ? findItemById(allItems, modalItemId) : null;
  const parentItem = modalParentId ? findItemById(allItems, modalParentId) : null;
  const menuKeys = Object.keys(workspace.menusDatabase);
  const isMain = workspace.activeMenuKey === "mainMenu";

  const desktopMenuKey = findMenuKeyAssignedToSurface(workspace, "desktop");
  const mobileMenuKey = findMenuKeyAssignedToSurface(workspace, "mobile");
  const editingDiffersFromLive =
    (desktopMenuKey && desktopMenuKey !== workspace.activeMenuKey) ||
    (mobileMenuKey && mobileMenuKey !== workspace.activeMenuKey);

  const openAddRoot = () => {
    setModalMode("add-root");
    setModalParentId(null);
    setModalItemId(null);
  };
  const openAddChild = (id: string) => {
    setModalMode("add-child");
    setModalParentId(id);
    setModalItemId(null);
  };
  const openEdit = (id: string) => {
    setModalMode("edit");
    setModalItemId(id);
    setModalParentId(null);
    setActiveInspectorId(id);
  };
  const closeModal = () => {
    setModalMode(null);
    setModalItemId(null);
    setModalParentId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const expandAll = () => setExpandedIds(new Set(collectParentIds(filteredTree)));
  const collapseAll = () => setExpandedIds(new Set());

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectBranch = (id: string) => {
    const item = findItemById(allItems, id);
    if (!item) return;
    const ids = MenuTreeService.collectDescendantIds(item);
    setSelectedIds((prev) => new Set([...prev, ...ids]));
  };

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    const next = MenuTreeService.removeItemsBulk(allItems, selectedIds);
    applyMenuItems(next);
    setSelectedIds(new Set());
  };
  const bulkDuplicate = () => {
    if (selectedIds.size === 0) return;
    const next = MenuTreeService.duplicateItemsBulk(allItems, selectedIds);
    applyMenuItems(next);
  };
  const bulkPlacement = (nextPlacement: MenuPlacement) => {
    if (selectedIds.size === 0) return;
    const next = MenuTreeService.updateItemsBulk(allItems, selectedIds, (item) => ({ ...item, placement: nextPlacement }));
    applyMenuItems(next);
  };
  const bulkVisibility = (visibility: MenuItemVisibility) => {
    if (selectedIds.size === 0) return;
    const next = MenuTreeService.updateItemsBulk(allItems, selectedIds, (item) => ({ ...item, visibility }));
    applyMenuItems(next);
  };
  const bulkMega = () => {
    if (selectedIds.size === 0) return;
    const next = MenuTreeService.updateItemsBulk(allItems, selectedIds, (item) => ({
      ...item,
      megaMenuType: item.megaMenuType ?? "dropdown",
    }));
    applyMenuItems(next);
  };
  const bulkExport = () => {
    const blob = MenuImportExportService.exportSelectedItemsBlob(allItems, selectedIds);
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `menu_selection_${workspace.activeMenuKey}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id ?? "");
    const overId = String(event.over?.id ?? "");
    if (!activeId || !overId || activeId === overId) return;
    const next = MenuTreeService.reorderByReference(allItems, activeId, overId);
    applyMenuItems(next);
  };

  const handleDeleteMenu = async () => {
    if (isMain) return;
    const menuName = menu.name;
    const keys = Object.keys(workspace.menusDatabase);
    const fallback = keys.find((k) => k !== workspace.activeMenuKey) ?? "mainMenu";
    deleteMenu(workspace.activeMenuKey);
    setActiveMenuKey(fallback);
    setConfirmDeleteMenu(false);
    const saved = await saveWorkspaceToServer();
    if (saved.ok) toast("success", `"${menuName}" deleted.`);
    else toast("error", "Failed to save after delete.");
  };

  const handleRename = async () => {
    if (!renameValue.trim()) {
      toast("error", "Name cannot be empty.");
      return;
    }
    renameMenu(workspace.activeMenuKey, renameValue.trim());
    setIsRenamingMenu(false);
    const saved = await saveWorkspaceToServer();
    if (!saved.ok) toast("error", "Failed to save menu name.");
  };

  const handleDuplicateMenu = async () => {
    const key = duplicateMenu(workspace.activeMenuKey);
    if (!key) return;
    const saved = await saveWorkspaceToServer();
    if (saved.ok) toast("success", "Menu duplicated.");
    else toast("error", "Failed to save duplicate.");
  };

  const handleSelectTemplate = (id: MenuTemplateId) => {
    setTemplateId(id);
    const items = MenuTemplateService.build(id);
    applyMenuItems(items);
    setExpandedIds(new Set(collectParentIds(items)));
    setSelectedIds(new Set());
    toast("success", `Applied "${id}" template.`);
  };

  const quickAddParentId =
    quickAddPlacement === "child" && activeInspectorId ? activeInspectorId : null;
  const quickAddParentItem = quickAddParentId ? findItemById(allItems, quickAddParentId) : null;
  const quickAddSearchNorm = quickAddSearch.trim().toLowerCase();
  const quickAddPages = catalog.pages.filter((page) => {
    if (!quickAddSearchNorm) return true;
    return (
      page.title.toLowerCase().includes(quickAddSearchNorm) ||
      page.slug.toLowerCase().includes(quickAddSearchNorm)
    );
  });

  const addQuickPages = () => {
    if (selectedQuickPages.length === 0) return;
    const newItems = selectedQuickPages.map((slug) =>
      newMenuItemFromForm({
        type: "page",
        label: labelForPageSlug(catalog, slug),
        placement: "both",
        pageId: slug,
      }),
    );
    for (const item of newItems) {
      if (quickAddParentId) addChildItem(quickAddParentId, item);
      else addRootItem(item);
    }
    if (quickAddParentId) {
      setExpandedIds((prev) => new Set([...prev, quickAddParentId]));
    }
    queueSave();
    setSelectedQuickPages([]);
  };

  return (
    <div className="space-y-4">
      {editingDiffersFromLive ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Live surfaces use menus assigned in Menu Manager. You are editing <strong>{menu.name}</strong>.
        </div>
      ) : null}

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              {isRenamingMenu ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-72"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename();
                      if (e.key === "Escape") setIsRenamingMenu(false);
                    }}
                  />
                  <Button size="sm" onClick={() => void handleRename()}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsRenamingMenu(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle>{menu.name}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => { setRenameValue(menu.name); setIsRenamingMenu(true); }}>
                    Rename
                  </Button>
                </div>
              )}
              <CardDescription>
                Professional tree manager with drag-and-drop, bulk actions, quick add, and live diagnostics.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={undo} disabled={historyPast.length === 0}>Undo</Button>
              <Button size="sm" variant="outline" onClick={redo} disabled={historyFuture.length === 0}>Redo</Button>
              <Button size="sm" variant="outline" onClick={() => void handleDuplicateMenu()}>Duplicate menu</Button>
              {!isMain ? (
                <Button size="sm" variant="outline" onClick={() => setConfirmDeleteMenu(true)}>Delete menu</Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <HeaderSelect value={workspace.activeMenuKey} onChange={(v) => setActiveMenuKey(v)}>
              {menuKeys.map((k) => (
                <option key={k} value={k}>
                  {workspace.menusDatabase[k]?.name ?? k}
                </option>
              ))}
            </HeaderSelect>
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search label, type, URL, id..." />
            <HeaderSelect value={placement} onChange={(v) => setPlacement(v as MenuPlacement)}>
              <option value="both">All placements</option>
              <option value="desktop">Desktop only</option>
              <option value="mobile">Mobile only</option>
            </HeaderSelect>
            <HeaderSelect value={statusFilter} onChange={(v) => setStatusFilter(v as "all" | MenuItemVisibility)}>
              <option value="all">All statuses</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </HeaderSelect>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <OptionButtonGroup
              value={density}
              columns={3}
              onChange={(next) => {
                const mode = next as DensityMode;
                setDensity(mode);
                window.localStorage.setItem(DENSITY_STORAGE_KEY, mode);
              }}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
                { value: "ultra", label: "Ultra Compact" },
              ]}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={expandAll}>Expand all</Button>
              <Button size="sm" variant="ghost" onClick={collapseAll}>Collapse all</Button>
              <Button size="sm" onClick={openAddRoot}>Add root item</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {confirmDeleteMenu ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <span>Delete &ldquo;{menu.name}&rdquo; and all items?</span>
              <Button size="sm" variant="destructive" onClick={() => void handleDeleteMenu()}>Delete</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDeleteMenu(false)}>Cancel</Button>
            </div>
          ) : null}

          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2.5">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button size="sm" variant="outline" onClick={bulkDelete}>Delete</Button>
              <Button size="sm" variant="outline" onClick={bulkDuplicate}>Duplicate</Button>
              <Button size="sm" variant="outline" onClick={() => bulkPlacement("desktop")}>Desktop</Button>
              <Button size="sm" variant="outline" onClick={() => bulkPlacement("mobile")}>Mobile</Button>
              <Button size="sm" variant="outline" onClick={() => bulkPlacement("both")}>Both</Button>
              <Button size="sm" variant="outline" onClick={() => bulkVisibility("visible")}>Visible</Button>
              <Button size="sm" variant="outline" onClick={() => bulkVisibility("hidden")}>Hidden</Button>
              <Button size="sm" variant="outline" onClick={bulkMega}>Mega</Button>
              <Button size="sm" variant="outline" onClick={bulkExport}>Export selected</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          ) : null}

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <span>{flatAll.length} total items</span>
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => setSelectedIds(new Set(flatAll.map((n) => n.id)))}
                >
                  Select all
                </button>
              </div>
              <div className="max-h-[70vh] overflow-auto rounded-xl border p-2">
                {filteredTree.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No matching items found.
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                            onToggleExpand={toggleExpand}
                            onToggleSelect={toggleSelect}
                            onSelectInspector={setActiveInspectorId}
                            onOpenModalEdit={openEdit}
                            onOpenAddChild={openAddChild}
                            onDeleteItem={(id) => {
                              removeItem(id);
                              queueSave();
                              if (activeInspectorId === id) setActiveInspectorId(null);
                            }}
                            onToggleBranch={selectBranch}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Inspector</CardTitle>
                  <CardDescription>Edit link target, display, and behavior inline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inspectorItem ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {inspectorItem.type}
                        </Badge>
                        <span className="truncate text-xs text-muted-foreground">
                          {getItemSubtitle(inspectorItem)}
                        </span>
                      </div>

                      <div className="space-y-3 rounded-lg border bg-muted/15 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Link target
                        </p>
                        {inspectorItem.type === "page" ? (
                          <div className="space-y-1">
                            <Label>Page</Label>
                            <PageSelect
                              catalog={catalog}
                              id="inspector-page"
                              value={inspectorItem.pageId ?? ""}
                              onChange={(pageId) => {
                                updateMenuItem(inspectorItem.id, {
                                  pageId,
                                  label: labelForPageSlug(catalog, pageId),
                                });
                                queueSave();
                              }}
                            />
                          </div>
                        ) : null}
                        {inspectorItem.type === "collection" || inspectorItem.type === "packageCategory" ? (
                          <div className="space-y-1">
                            <Label>Collection</Label>
                            <CollectionSelect
                              catalog={catalog}
                              id="inspector-collection"
                              value={inspectorItem.collectionId ?? ""}
                              onChange={(collectionId) => {
                                updateMenuItem(inspectorItem.id, {
                                  collectionId,
                                  label: labelForCollectionSlug(catalog, collectionId),
                                });
                                queueSave();
                              }}
                            />
                          </div>
                        ) : null}
                        {inspectorItem.type === "product" || inspectorItem.type === "package" ? (
                          <div className="space-y-1">
                            <Label>Product</Label>
                            <ProductSelect
                              catalog={catalog}
                              id="inspector-product"
                              value={inspectorItem.productId ?? ""}
                              onChange={(productId) => {
                                updateMenuItem(inspectorItem.id, {
                                  productId,
                                  label: labelForProductSlug(catalog, productId),
                                });
                                queueSave();
                              }}
                            />
                          </div>
                        ) : null}
                        {inspectorItem.type === "link" ? (
                          <div className="space-y-1">
                            <Label>URL</Label>
                            <Input
                              value={inspectorItem.url ?? ""}
                              onChange={(e) => updateMenuItem(inspectorItem.id, { url: e.target.value })}
                              onBlur={queueSave}
                            />
                          </div>
                        ) : null}
                        {inspectorItem.type === "image" ? (
                          <div className="space-y-1">
                            <Label>Link URL</Label>
                            <Input
                              value={inspectorItem.linkUrl ?? ""}
                              onChange={(e) => updateMenuItem(inspectorItem.id, { linkUrl: e.target.value })}
                              onBlur={queueSave}
                            />
                          </div>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          Resolves to{" "}
                          <code className="rounded bg-muted px-1 py-0.5">
                            {getItemHref(inspectorItem, "en")}
                          </code>
                        </p>
                      </div>

                      <div className="space-y-3 rounded-lg border p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Display
                        </p>
                        <div className="space-y-1">
                          <Label>Label</Label>
                          <Input
                            value={inspectorItem.label}
                            onChange={(e) => updateMenuItem(inspectorItem.id, { label: e.target.value })}
                            onBlur={queueSave}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Icon (Font Awesome class)</Label>
                          <Input
                            value={inspectorItem.icon ?? ""}
                            placeholder="fa-house"
                            onChange={(e) => updateMenuItem(inspectorItem.id, { icon: e.target.value })}
                            onBlur={queueSave}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Placement</Label>
                          <OptionButtonGroup
                            value={inspectorItem.placement}
                            columns={3}
                            options={[
                              { value: "both", label: "Both" },
                              { value: "desktop", label: "Desktop" },
                              { value: "mobile", label: "Mobile" },
                            ]}
                            onChange={(value) => {
                              updateMenuItem(inspectorItem.id, { placement: value as MenuPlacement });
                              queueSave();
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Behavior
                        </p>
                        <div className="space-y-1">
                          <Label>Status</Label>
                          <HeaderSelect
                            value={inspectorItem.visibility ?? "visible"}
                            onChange={(value) => {
                              updateMenuItem(inspectorItem.id, { visibility: value as MenuItemVisibility });
                              queueSave();
                            }}
                          >
                            <option value="visible">Visible</option>
                            <option value="hidden">Hidden</option>
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                          </HeaderSelect>
                        </div>
                        <div className="space-y-1">
                          <Label>Custom CSS class</Label>
                          <Input
                            value={inspectorItem.customClass ?? ""}
                            onChange={(e) => updateMenuItem(inspectorItem.id, { customClass: e.target.value })}
                            onBlur={queueSave}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={inspectorItem.openInNewTab === true}
                              onChange={(e) => {
                                updateMenuItem(inspectorItem.id, { openInNewTab: e.target.checked });
                                queueSave();
                              }}
                            />
                            New tab
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={inspectorItem.noFollow === true}
                              onChange={(e) => {
                                updateMenuItem(inspectorItem.id, { noFollow: e.target.checked });
                                queueSave();
                              }}
                            />
                            No-follow
                          </label>
                        </div>
                      </div>

                      <Button size="sm" variant="outline" className="w-full" onClick={() => openEdit(inspectorItem.id)}>
                        Open advanced modal
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Select an item from the tree to edit its properties.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quick Add</CardTitle>
                  <CardDescription>Add multiple pages as root items or children.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Placement</Label>
                    <OptionButtonGroup
                      value={quickAddPlacement}
                      columns={2}
                      options={[
                        { value: "root", label: "Root" },
                        { value: "child", label: "Child" },
                      ]}
                      onChange={(value) => setQuickAddPlacement(value as QuickAddPlacement)}
                    />
                    {quickAddPlacement === "child" ? (
                      <p className="text-xs text-muted-foreground">
                        {quickAddParentItem
                          ? `Will add under “${quickAddParentItem.label}”.`
                          : "No item selected — will add as root instead."}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quick-add-search">Search pages</Label>
                    <Input
                      id="quick-add-search"
                      value={quickAddSearch}
                      onChange={(e) => setQuickAddSearch(e.target.value)}
                      placeholder="Filter by title or slug…"
                    />
                  </div>
                  <div className="max-h-52 space-y-1 overflow-auto rounded-md border p-2">
                    {quickAddPages.length === 0 ? (
                      <p className="px-1 py-2 text-sm text-muted-foreground">No pages match your search.</p>
                    ) : (
                      quickAddPages.map((page) => {
                        const checked = selectedQuickPages.includes(page.slug);
                        return (
                          <label key={page.slug} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setSelectedQuickPages((prev) =>
                                  e.target.checked
                                    ? [...prev, page.slug]
                                    : prev.filter((slug) => slug !== page.slug),
                                )
                              }
                            />
                            <span className="truncate">{page.title}</span>
                            <span className="truncate text-xs text-muted-foreground">({page.slug})</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <Button size="sm" className="w-full" onClick={addQuickPages} disabled={selectedQuickPages.length === 0}>
                    Add {selectedQuickPages.length || ""} selected page{selectedQuickPages.length === 1 ? "" : "s"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <HeaderSelect value={templateId} onChange={(v) => setTemplateId(v as MenuTemplateId)}>
                    {MenuTemplateService.list().map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </HeaderSelect>
                  <Button size="sm" variant="outline" onClick={() => handleSelectTemplate(templateId)}>
                    <Sparkles className="mr-1 h-4 w-4" />
                    Apply template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Menu Analytics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded border p-2">Total: {analytics.total}</div>
                  <div className="rounded border p-2">Visible: {analytics.visible}</div>
                  <div className="rounded border p-2">Hidden: {analytics.hidden}</div>
                  <div className="rounded border p-2">Draft: {analytics.draft}</div>
                  <div className="rounded border p-2">Desktop: {analytics.desktop}</div>
                  <div className="rounded border p-2">Mobile: {analytics.mobile}</div>
                  <div className="rounded border p-2">Mega menus: {analytics.megaMenus}</div>
                  <div className="rounded border p-2">Max depth: {analytics.maxDepth}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Menu Health</CardTitle>
                  <CardDescription>Real-time diagnostics and validation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {healthIssues.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      No issues detected.
                    </div>
                  ) : (
                    healthIssues.slice(0, 8).map((issue) => (
                      <button
                        key={issue.key}
                        type="button"
                        className="flex w-full items-start gap-2 rounded-md border p-2 text-left text-sm"
                        onClick={() => issue.itemId && setActiveInspectorId(issue.itemId)}
                      >
                        {issue.severity === "error" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                        )}
                        <span>{issue.message}</span>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <MenuItemModal
        mode={modalMode}
        parentId={modalParentId}
        parentItem={parentItem}
        itemId={modalItemId}
        defaultPlacement={placement === "both" ? "both" : placement}
        editingItem={editingItem}
        onClose={closeModal}
      />
    </div>
  );
}
