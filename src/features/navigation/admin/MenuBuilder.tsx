"use client";

import { useState } from "react";
import { useStore } from "@nanostores/react";
import type { DragEndEvent } from "@dnd-kit/core";
import type { MenuItem, MenuItemVisibility, MenuPlacement } from "@/features/navigation/types";
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
import { findItemById, findMenuKeyAssignedToSurface } from "@/features/navigation/menu-engine";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MenuItemModal, type ModalMode } from "./MenuItemModal";
import { MenuTreeService } from "@/features/navigation/menu-tree-service";
import { MenuAnalyticsService } from "@/features/navigation/menu-analytics-service";
import { MenuValidationService } from "@/features/navigation/menu-validation-service";
import { MenuImportExportService } from "@/features/navigation/menu-import-export-service";
import { MenuTemplateService, type MenuTemplateId } from "@/features/navigation/menu-template-service";
import {
  applyMegaMenuPreset,
  type MegaMenuPresetId,
} from "@/features/navigation/mega-menu-presets";
import { useHeaderBuilderCatalog } from "./HeaderBuilderCatalogContext";
import { newMenuItemFromForm } from "@/features/navigation/defaults";
import { MenuBuilderHeader } from "./menu-builder/MenuBuilderHeader";
import { MenuBulkToolbar } from "./menu-builder/MenuBulkToolbar";
import { MenuTreePanel } from "./menu-builder/MenuTreePanel";
import { EditorPanel, type EditorToolTab } from "./menu-builder/EditorPanel";
import { MenuInspector, type InspectorSection } from "./menu-builder/MenuInspector";
import { MenuQuickAdd } from "./menu-builder/MenuQuickAdd";
import { MenuTemplates } from "./menu-builder/MenuTemplates";
import { MenuHealthPanel } from "./menu-builder/MenuHealthPanel";
import type { DensityMode } from "./menu-builder/SortableTreeItem";
import { useSyncMenuItemTranslations } from "./use-sync-menu-item-translations";

const DENSITY_STORAGE_KEY = "hb-builder-density";

function labelForPageSlug(catalog: { pages: { slug: string; title: string }[] }, pageId: string): string {
  return catalog.pages.find((p) => p.slug === pageId)?.title?.trim() || pageId.trim() || "Page";
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

export function MenuBuilder({ onSwitchToManager }: { onSwitchToManager?: () => void }) {
  const workspace = useStore($workspace);
  const catalog = useHeaderBuilderCatalog().catalog;
  const menu = workspace.menusDatabase[workspace.activeMenuKey];
  const adminForm = useAdminFormOptional();

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
  const [megaPresetId, setMegaPresetId] = useState<MegaMenuPresetId>("unifi-start-here");
  const [density, setDensity] = useState<DensityMode>(() => {
    if (typeof window === "undefined") return "comfortable";
    const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return saved === "compact" || saved === "ultra" ? saved : "comfortable";
  });
  const [quickAddPlacement, setQuickAddPlacement] = useState<"root" | "child">("root");
  const [editorTab, setEditorTab] = useState<EditorToolTab>("edit");
  const [inspectorSection, setInspectorSection] = useState<InspectorSection>("content");
  const syncMenuItemTranslations = useSyncMenuItemTranslations(workspace.activeMenuKey);

  const toast = (type: "success" | "error", message: string) => {
    adminForm?.showToast(message, type);
  };

  if (!menu) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No menu selected. Go to Menu Manager to select or create a menu.
          </p>
          {onSwitchToManager ? (
            <Button type="button" variant="outline" onClick={onSwitchToManager}>
              Open Menu Manager
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const applyMenuItems = (nextItems: MenuItem[], options?: { pushHistory?: boolean }) => {
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
    setEditorTab("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setModalItemId(null);
    setModalParentId(null);
  };

  const selectInspector = (id: string) => {
    setActiveInspectorId(id);
    setEditorTab("edit");
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

  const duplicateItem = (id: string) => {
    applyMenuItems(MenuTreeService.duplicateItemsBulk(allItems, new Set([id])));
  };

  const toggleItemVisibility = (id: string) => {
    const item = findItemById(allItems, id);
    if (!item) return;
    const nextVis: MenuItemVisibility = (item.visibility ?? "visible") === "hidden" ? "visible" : "hidden";
    updateMenuItem(id, { visibility: nextVis });
  };

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    applyMenuItems(MenuTreeService.removeItemsBulk(allItems, selectedIds));
    setSelectedIds(new Set());
  };
  const bulkDuplicate = () => {
    if (selectedIds.size === 0) return;
    applyMenuItems(MenuTreeService.duplicateItemsBulk(allItems, selectedIds));
  };
  const bulkPlacement = (nextPlacement: MenuPlacement) => {
    if (selectedIds.size === 0) return;
    applyMenuItems(
      MenuTreeService.updateItemsBulk(allItems, selectedIds, (item) => ({
        ...item,
        placement: nextPlacement,
      })),
    );
  };
  const bulkVisibility = (visibility: MenuItemVisibility) => {
    if (selectedIds.size === 0) return;
    applyMenuItems(
      MenuTreeService.updateItemsBulk(allItems, selectedIds, (item) => ({ ...item, visibility })),
    );
  };
  const bulkMega = () => {
    if (selectedIds.size === 0) return;
    applyMenuItems(
      MenuTreeService.updateItemsBulk(allItems, selectedIds, (item) => ({
        ...item,
        megaMenuType: item.megaMenuType ?? "dropdown",
      })),
    );
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
    applyMenuItems(MenuTreeService.reorderByReference(allItems, activeId, overId));
  };

  const handleDeleteMenu = () => {
    if (isMain) return;
    const menuName = menu.name;
    const keys = Object.keys(workspace.menusDatabase);
    const fallback = keys.find((k) => k !== workspace.activeMenuKey) ?? "mainMenu";
    deleteMenu(workspace.activeMenuKey);
    setActiveMenuKey(fallback);
    setConfirmDeleteMenu(false);
    toast("success", `"${menuName}" deleted. Save to keep, Publish to go live.`);
  };

  const handleRename = () => {
    if (!renameValue.trim()) {
      toast("error", "Name cannot be empty.");
      return;
    }
    renameMenu(workspace.activeMenuKey, renameValue.trim());
    setIsRenamingMenu(false);
  };

  const handleDuplicateMenu = () => {
    const key = duplicateMenu(workspace.activeMenuKey);
    if (!key) return;
    toast("success", "Menu duplicated. Save to keep, Publish to go live.");
  };

  const handleSelectTemplate = () => {
    const items = MenuTemplateService.build(templateId);
    applyMenuItems(items);
    setExpandedIds(new Set(collectParentIds(items)));
    setSelectedIds(new Set());
    toast("success", `Applied "${templateId}" template.`);
  };

  const handleApplyMegaPreset = () => {
    if (!inspectorItem) {
      toast("error", "Select a parent menu item first.");
      return;
    }
    const next = applyMegaMenuPreset(inspectorItem, megaPresetId);
    updateMenuItem(inspectorItem.id, {
      megaMenuType: next.megaMenuType,
      megaMenu: next.megaMenu,
      children: next.children,
    });
    setExpandedIds((prev) => new Set([...prev, inspectorItem.id]));
    toast("success", `Applied mega preset "${megaPresetId}".`);
  };

  const addQuickPages = (slugs: string[]) => {
    if (slugs.length === 0) return;
    const parentId =
      quickAddPlacement === "child" && activeInspectorId ? activeInspectorId : null;
    const newItems = slugs.map((slug) =>
      newMenuItemFromForm({
        type: "page",
        label: labelForPageSlug(catalog, slug),
        placement: "both",
        pageId: slug,
      }),
    );
    for (const item of newItems) {
      if (parentId) addChildItem(parentId, item);
      else addRootItem(item);
    }
    if (parentId) {
      setExpandedIds((prev) => new Set([...prev, parentId]));
    }
  };

  return (
    <div className="mb-workspace space-y-4">
      {editingDiffersFromLive ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Live surfaces use menus assigned in Menu Manager. You are editing <strong>{menu.name}</strong>.
        </div>
      ) : null}

      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <MenuBuilderHeader
          menuName={menu.name}
          menuKeys={menuKeys}
          menusDatabase={workspace.menusDatabase}
          activeMenuKey={workspace.activeMenuKey}
          isMain={isMain}
          isRenamingMenu={isRenamingMenu}
          renameValue={renameValue}
          searchQuery={searchQuery}
          placement={placement}
          statusFilter={statusFilter}
          density={density}
          canUndo={historyPast.length > 0}
          canRedo={historyFuture.length > 0}
          analytics={analytics}
          healthIssues={healthIssues}
          onActiveMenuChange={setActiveMenuKey}
          onStartRename={() => {
            setRenameValue(menu.name);
            setIsRenamingMenu(true);
          }}
          onRenameValueChange={setRenameValue}
          onSaveRename={() => handleRename()}
          onCancelRename={() => setIsRenamingMenu(false)}
          onSearchChange={setSearchQuery}
          onPlacementFilterChange={setPlacement}
          onStatusFilterChange={setStatusFilter}
          onDensityChange={(mode) => {
            setDensity(mode);
            window.localStorage.setItem(DENSITY_STORAGE_KEY, mode);
          }}
          onUndo={undo}
          onRedo={redo}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onAddRoot={openAddRoot}
          onDuplicateMenu={() => handleDuplicateMenu()}
          onDeleteMenu={() => setConfirmDeleteMenu(true)}
          onOpenHealth={() => setEditorTab("health")}
        />

        {confirmDeleteMenu ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <span>Delete &ldquo;{menu.name}&rdquo; and all items?</span>
            <Button size="sm" variant="destructive" onClick={() => handleDeleteMenu()}>
              Delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDeleteMenu(false)}>
              Cancel
            </Button>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
          <div className="space-y-3">
            <MenuBulkToolbar
              count={selectedIds.size}
              onDelete={bulkDelete}
              onDuplicate={bulkDuplicate}
              onPlacement={bulkPlacement}
              onVisibility={bulkVisibility}
              onMega={bulkMega}
              onExport={bulkExport}
              onClear={() => setSelectedIds(new Set())}
            />
            <MenuTreePanel
              filteredTree={filteredTree}
              flatCount={flatAll.length}
              expandedIds={expandedIds}
              selectedIds={selectedIds}
              activeInspectorId={activeInspectorId}
              density={density}
              onDragEnd={handleDragEnd}
              onSelectAll={() => setSelectedIds(new Set(flatAll.map((n) => n.id)))}
              onToggleExpand={toggleExpand}
              onToggleSelect={toggleSelect}
              onSelectInspector={selectInspector}
              onOpenModalEdit={openEdit}
              onOpenAddChild={openAddChild}
              onDeleteItem={(id) => {
                removeItem(id);
                if (activeInspectorId === id) setActiveInspectorId(null);
              }}
              onToggleBranch={selectBranch}
              onDuplicateItem={duplicateItem}
              onToggleVisibility={toggleItemVisibility}
            />
          </div>

          <div className="min-w-0 rounded-xl border bg-muted/10 p-3">
            <EditorPanel
              value={editorTab}
              onChange={setEditorTab}
              edit={
                <MenuInspector
                  item={inspectorItem}
                  menuKey={workspace.activeMenuKey}
                  catalog={catalog}
                  section={inspectorSection}
                  onSectionChange={setInspectorSection}
                  onDeselect={() => setActiveInspectorId(null)}
                  onOpenAdvanced={() => {
                    if (activeInspectorId) openEdit(activeInspectorId);
                  }}
                  onAddChild={() => {
                    if (activeInspectorId) openAddChild(activeInspectorId);
                  }}
                  onPatch={(patch) => {
                    if (!activeInspectorId) return;
                    updateMenuItem(activeInspectorId, patch);
                    syncMenuItemTranslations(activeInspectorId, patch);
                  }}
                />
              }
              quickAdd={
                <MenuQuickAdd
                  catalog={catalog}
                  parentItem={inspectorItem}
                  placement={quickAddPlacement}
                  onPlacementChange={setQuickAddPlacement}
                  onAddPages={addQuickPages}
                />
              }
              templates={
                <MenuTemplates
                  templateId={templateId}
                  onTemplateIdChange={setTemplateId}
                  onApply={handleSelectTemplate}
                  megaPresetId={megaPresetId}
                  onMegaPresetIdChange={setMegaPresetId}
                  onApplyMegaPreset={handleApplyMegaPreset}
                  hasSelectedParent={Boolean(inspectorItem)}
                />
              }
              health={
                <MenuHealthPanel
                  issues={healthIssues}
                  onGoToItem={(itemId) => {
                    selectInspector(itemId);
                    setEditorTab("edit");
                  }}
                />
              }
            />
          </div>
        </div>
      </div>

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
