"use client";

import { useStore } from "@nanostores/react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Image,
  Link2,
  Package,
  Pen,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { MenuItem, MenuItemType, MenuPlacement } from "@/features/navigation/types";
import {
  $workspace,
  deleteMenu,
  duplicateMenu,
  moveRootItemDown,
  moveRootItemUp,
  removeItem,
  renameMenu,
  setActiveMenuKey,
} from "@/features/navigation/header-store";
import {
  countTotalItems,
  filterByPlacement,
  findItemById,
  findMenuKeyAssignedToSurface,
  getItemSubtitle,
} from "@/features/navigation/menu-engine";
import { saveWorkspaceToServer } from "@/features/navigation/header-workspace-api";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { OptionButtonGroup, HeaderSelect } from "./header-builder-ui";
import { MenuItemModal, type ModalMode } from "./MenuItemModal";

function typeIcon(type: MenuItemType) {
  switch (type) {
    case "page":
      return FileText;
    case "collection":
    case "packageCategory":
      return FolderOpen;
    case "product":
    case "package":
      return Package;
    case "image":
      return Image;
    case "post":
      return ShoppingBag;
    default:
      return Link2;
  }
}

function placementLabel(placement: MenuItem["placement"]) {
  if (placement === "both") return "Desktop & mobile";
  if (placement === "desktop") return "Desktop";
  return "Mobile";
}

// ─── Menu Item Row ────────────────────────────────────────────────────────────

function MenuItemRow({
  item,
  level,
  isFirst,
  isLast,
  showReorder,
  deletingItemId,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onAddChild,
  onMoveUp,
  onMoveDown,
}: {
  item: MenuItem;
  level: number;
  isFirst: boolean;
  isLast: boolean;
  showReorder: boolean;
  deletingItemId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onAddChild: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  const TypeIcon = typeIcon(item.type);
  const isDeleting = deletingItemId === item.id;

  return (
    <div data-item-id={item.id} className={cn(level > 0 && "border-s-2 border-dashed border-border ps-4 ms-4 mt-2")}>
      <div
        className={cn(
          "rounded-lg border bg-card p-3 transition-colors hover:border-primary/30",
          isDeleting && "border-destructive/40",
        )}
      >
        {isDeleting ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>
              Delete &ldquo;{item.label}&rdquo; and all its children?
            </span>
            <Button type="button" size="sm" variant="destructive" onClick={() => onConfirmDelete(item.id)}>
              Delete
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancelDelete}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {showReorder && level === 0 ? (
              <div className="flex shrink-0 flex-col gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  title="Move up"
                  disabled={isFirst}
                  onClick={() => onMoveUp(item.id)}
                  aria-label="Move item up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  title="Move down"
                  disabled={isLast}
                  onClick={() => onMoveDown(item.id)}
                  aria-label="Move item down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                {item.icon?.trim() ? (
                  <i className={`fas ${item.icon.trim()} text-sm text-muted-foreground`} aria-hidden />
                ) : (
                  <TypeIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{item.label}</span>
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {item.type}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {placementLabel(item.placement)}
                  </Badge>
                  {item.children?.length ? (
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-[10px] text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                      {item.children.length} child{item.children.length !== 1 ? "ren" : ""}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {getItemSubtitle(item)}
                  {item.megaMenuType ? ` · Mega: ${item.megaMenuType}` : ""}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Edit item"
                onClick={() => onEdit(item.id)}
                aria-label="Edit item"
              >
                <Pen className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                title="Delete item"
                onClick={() => onDelete(item.id)}
                aria-label="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onAddChild(item.id)}>
                <Plus className="h-3.5 w-3.5" />
                Add child
              </Button>
            </div>
          </div>
        )}
      </div>

      {item.children?.length ? (
        <div>
          {item.children.map((ch, idx) => (
            <MenuItemRow
              key={ch.id}
              item={ch}
              level={level + 1}
              isFirst={idx === 0}
              isLast={idx === item.children.length - 1}
              showReorder={false}
              deletingItemId={deletingItemId}
              onEdit={onEdit}
              onDelete={onDelete}
              onConfirmDelete={onConfirmDelete}
              onCancelDelete={onCancelDelete}
              onAddChild={onAddChild}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── MenuBuilder ──────────────────────────────────────────────────────────────

export function MenuBuilder({ onSwitchToManager }: { onSwitchToManager?: () => void }) {
  const workspace = useStore($workspace);
  const menu = workspace.menusDatabase[workspace.activeMenuKey];
  const adminForm = useAdminFormOptional();

  const [placement, setPlacement] = useState<MenuPlacement>("both");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isRenamingMenu, setIsRenamingMenu] = useState(false);
  const [renameValue, setRenameValue] = useState("");

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

  const allItems = menu.items;
  const filtered = filterByPlacement(allItems, placement);
  const editingItem = modalItemId ? findItemById(allItems, modalItemId) : null;
  const parentItem = modalParentId ? findItemById(allItems, modalParentId) : null;
  const isMain = workspace.activeMenuKey === "mainMenu";
  const showReorder = placement === "both";

  const defaultPlacementForModal: MenuPlacement =
    placement === "both" ? "both" : placement;

  const openAddRoot = () => {
    setModalMode("add-root");
    setModalParentId(null);
    setModalItemId(null);
  };

  const openAddChild = (parentId: string) => {
    setModalMode("add-child");
    setModalParentId(parentId);
    setModalItemId(null);
  };

  const openEdit = (id: string) => {
    setModalMode("edit");
    setModalItemId(id);
    setModalParentId(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setModalParentId(null);
    setModalItemId(null);
  };

  const handleDuplicate = async () => {
    const newKey = duplicateMenu(workspace.activeMenuKey);
    if (!newKey) return;
    const r = await saveWorkspaceToServer();
    if (r.ok) toast("success", "Menu duplicated.");
    else toast("error", "Failed to save duplicate.");
  };

  const handleDelete = async () => {
    if (isMain) {
      toast("error", "Main Menu cannot be deleted.");
      return;
    }
    const menuName = menu.name;
    const keys = Object.keys(workspace.menusDatabase);
    const fallback = keys.find((k) => k !== workspace.activeMenuKey) ?? "mainMenu";
    deleteMenu(workspace.activeMenuKey);
    setActiveMenuKey(fallback);
    setConfirmDelete(false);
    const r = await saveWorkspaceToServer();
    if (r.ok) toast("success", `"${menuName}" deleted.`);
    else toast("error", "Failed to save after delete.");
  };

  const handleRename = async () => {
    if (!renameValue.trim()) {
      toast("error", "Name cannot be empty.");
      return;
    }
    renameMenu(workspace.activeMenuKey, renameValue.trim());
    setIsRenamingMenu(false);
    const r = await saveWorkspaceToServer();
    if (!r.ok) toast("error", "Failed to save rename.");
  };

  const handleDeleteItem = (id: string) => {
    setDeletingItemId(id);
  };

  const handleConfirmDeleteItem = (id: string) => {
    removeItem(id);
    setDeletingItemId(null);
    void saveWorkspaceToServer();
  };

  const menuKeys = Object.keys(workspace.menusDatabase);
  const desktopMenuKey = findMenuKeyAssignedToSurface(workspace, "desktop");
  const mobileMenuKey = findMenuKeyAssignedToSurface(workspace, "mobile");
  const desktopMenuName = desktopMenuKey
    ? (workspace.menusDatabase[desktopMenuKey]?.name ?? desktopMenuKey)
    : null;
  const mobileMenuName = mobileMenuKey
    ? (workspace.menusDatabase[mobileMenuKey]?.name ?? mobileMenuKey)
    : null;
  const editingDiffersFromLive =
    (desktopMenuKey && desktopMenuKey !== workspace.activeMenuKey) ||
    (mobileMenuKey && mobileMenuKey !== workspace.activeMenuKey);

  const persistAfterReorder = (fn: (id: string) => void) => (id: string) => {
    fn(id);
    void saveWorkspaceToServer();
  };

  return (
    <div className="space-y-4">
      {editingDiffersFromLive ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm" role="status">
          Public site uses{" "}
          {desktopMenuName ? <strong>{desktopMenuName}</strong> : null}
          {desktopMenuName && mobileMenuName ? " and " : null}
          {mobileMenuName ? <strong>{mobileMenuName}</strong> : null} on live surfaces.
          You are editing <strong>{menu.name}</strong>.
          {desktopMenuKey && desktopMenuKey !== workspace.activeMenuKey ? (
            <>
              {" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setActiveMenuKey(desktopMenuKey)}
              >
                Edit {desktopMenuName ?? "desktop menu"}
              </button>
            </>
          ) : (
            <> Switch menu below or change placement in Menu Manager.</>
          )}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              {isRenamingMenu ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="max-w-xs"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename();
                      if (e.key === "Escape") setIsRenamingMenu(false);
                    }}
                  />
                  <Button type="button" size="sm" onClick={() => void handleRename()}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setIsRenamingMenu(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{menu.name}</CardTitle>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRenameValue(menu.name);
                      setIsRenamingMenu(true);
                    }}
                  >
                    Rename
                  </Button>
                </div>
              )}
              {menuKeys.length > 1 ? (
                <div className="space-y-1">
                  <Label className="text-xs">Switch menu</Label>
                  <HeaderSelect
                    value={workspace.activeMenuKey}
                    onChange={(v) => setActiveMenuKey(v)}
                    className="max-w-xs"
                  >
                    {menuKeys.map((k) => (
                      <option key={k} value={k}>
                        {workspace.menusDatabase[k]?.name ?? k}
                      </option>
                    ))}
                  </HeaderSelect>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void handleDuplicate()}>
                Duplicate
              </Button>
              {!isMain ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>
                  Delete menu
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <span>Delete &ldquo;{menu.name}&rdquo; and all items?</span>
              <Button type="button" size="sm" variant="destructive" onClick={() => void handleDelete()}>
                Delete
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-sm font-medium">Show items</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Filters the list only. Set placement per item when adding or editing.
            </p>
            <OptionButtonGroup
              value={placement}
              options={[
                { value: "both", label: "All items" },
                { value: "desktop", label: "Desktop only" },
                { value: "mobile", label: "Mobile only" },
              ]}
              onChange={setPlacement}
              columns={3}
            />
            <CardDescription className="mt-2">
              {countTotalItems(filtered)} item{countTotalItems(filtered) !== 1 ? "s" : ""}
            </CardDescription>
          </div>

          {showReorder && allItems.length > 1 ? (
            <p className="text-xs text-muted-foreground">Use arrows on each root item to reorder.</p>
          ) : null}

          <div className="hb-menu-list-scroll h-[min(520px,50vh)] overflow-y-auto overscroll-contain rounded-lg border">
            <div className="space-y-2 p-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {placement === "both"
                      ? "No items yet."
                      : `No items with "${placement}" placement.`}
                  </p>
                  <Button type="button" onClick={openAddRoot}>
                    Add menu item
                  </Button>
                </div>
              ) : (
                filtered.map((item, idx) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    level={0}
                    isFirst={idx === 0}
                    isLast={idx === filtered.length - 1}
                    showReorder={showReorder}
                    deletingItemId={deletingItemId}
                    onEdit={openEdit}
                    onDelete={handleDeleteItem}
                    onConfirmDelete={handleConfirmDeleteItem}
                    onCancelDelete={() => setDeletingItemId(null)}
                    onAddChild={openAddChild}
                    onMoveUp={persistAfterReorder(moveRootItemUp)}
                    onMoveDown={persistAfterReorder(moveRootItemDown)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button type="button" onClick={openAddRoot}>
              Add root item
            </Button>
            <span className="text-xs text-muted-foreground">
              Supports unlimited nesting. Use Add child on any row to add sub-items.
            </span>
          </div>
        </CardContent>
      </Card>

      <MenuItemModal
        mode={modalMode}
        parentId={modalParentId}
        parentItem={parentItem}
        itemId={modalItemId}
        defaultPlacement={defaultPlacementForModal}
        editingItem={editingItem}
        onClose={closeModal}
      />
    </div>
  );
}
