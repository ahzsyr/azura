"use client";

import { MoreHorizontal } from "lucide-react";
import type { MenuItemVisibility, MenuPlacement } from "@/features/navigation/types";
import type { MenuAnalytics } from "@/features/navigation/menu-analytics-service";
import type { MenuHealthIssue } from "@/features/navigation/menu-validation-service";
import type { DensityMode } from "./SortableTreeItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OptionButtonGroup, HeaderSelect } from "../header-builder-ui";

type Props = {
  menuName: string;
  menuKeys: string[];
  menusDatabase: Record<string, { name: string } | undefined>;
  activeMenuKey: string;
  isMain: boolean;
  isRenamingMenu: boolean;
  renameValue: string;
  searchQuery: string;
  placement: MenuPlacement;
  statusFilter: "all" | MenuItemVisibility;
  density: DensityMode;
  canUndo: boolean;
  canRedo: boolean;
  analytics: MenuAnalytics;
  healthIssues: MenuHealthIssue[];
  onActiveMenuChange: (key: string) => void;
  onStartRename: () => void;
  onRenameValueChange: (v: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onSearchChange: (v: string) => void;
  onPlacementFilterChange: (v: MenuPlacement) => void;
  onStatusFilterChange: (v: "all" | MenuItemVisibility) => void;
  onDensityChange: (v: DensityMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onAddRoot: () => void;
  onDuplicateMenu: () => void;
  onDeleteMenu: () => void;
  onOpenHealth: () => void;
};

export function MenuBuilderHeader({
  menuName,
  menuKeys,
  menusDatabase,
  activeMenuKey,
  isMain,
  isRenamingMenu,
  renameValue,
  searchQuery,
  placement,
  statusFilter,
  density,
  canUndo,
  canRedo,
  analytics,
  healthIssues,
  onActiveMenuChange,
  onStartRename,
  onRenameValueChange,
  onSaveRename,
  onCancelRename,
  onSearchChange,
  onPlacementFilterChange,
  onStatusFilterChange,
  onDensityChange,
  onUndo,
  onRedo,
  onExpandAll,
  onCollapseAll,
  onAddRoot,
  onDuplicateMenu,
  onDeleteMenu,
  onOpenHealth,
}: Props) {
  return (
    <div className="mb-builder-header space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {isRenamingMenu ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="w-72"
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveRename();
                  if (e.key === "Escape") onCancelRename();
                }}
              />
              <Button size="sm" onClick={onSaveRename}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelRename}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{menuName}</h2>
              <Button size="sm" variant="ghost" onClick={onStartRename}>
                Rename
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {analytics.total} items · {analytics.visible} visible · {analytics.hidden} hidden ·{" "}
            {analytics.megaMenus} parents
            {healthIssues.length > 0 ? (
              <>
                {" · "}
                <button type="button" className="underline underline-offset-2" onClick={onOpenHealth}>
                  Menu Health · {healthIssues.length} issue{healthIssues.length === 1 ? "" : "s"}
                </button>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onUndo} disabled={!canUndo}>
            Undo
          </Button>
          <Button size="sm" variant="outline" onClick={onRedo} disabled={!canRedo}>
            Redo
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <MoreHorizontal className="h-4 w-4" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicateMenu}>Duplicate menu</DropdownMenuItem>
              {!isMain ? (
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDeleteMenu}>
                  Delete menu
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenHealth}>Menu Health</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <HeaderSelect value={activeMenuKey} onChange={onActiveMenuChange}>
          {menuKeys.map((k) => (
            <option key={k} value={k}>
              {menusDatabase[k]?.name ?? k}
            </option>
          ))}
        </HeaderSelect>
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search items…"
        />
        <HeaderSelect value={placement} onChange={(v) => onPlacementFilterChange(v as MenuPlacement)}>
          <option value="both">All placements</option>
          <option value="desktop">Desktop only</option>
          <option value="mobile">Mobile only</option>
        </HeaderSelect>
        <HeaderSelect
          value={statusFilter}
          onChange={(v) => onStatusFilterChange(v as "all" | MenuItemVisibility)}
        >
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
          onChange={(next) => onDensityChange(next as DensityMode)}
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact", label: "Compact" },
            { value: "ultra", label: "Ultra" },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onExpandAll}>
            Expand all
          </Button>
          <Button size="sm" variant="ghost" onClick={onCollapseAll}>
            Collapse all
          </Button>
          <Button size="sm" onClick={onAddRoot}>
            Add root item
          </Button>
        </div>
      </div>
    </div>
  );
}
