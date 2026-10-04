"use client";

import { create } from "zustand";
import type {
  BrandingState,
  GlobalApply,
  HeaderAction,
  HeaderBuilderSettings,
  HeaderWorkspace,
  MenuItem,
  MenuRecord,
} from "./types";
import { createDefaultWorkspace, mergeWorkspaceImport } from "./defaults";
import { normalizeBranding } from "./branding-defaults";
import { DEFAULT_FLYOUT_MENU_TYPE } from "./resolve-href";
import {
  addChildImmutable,
  deleteItemImmutable,
  findItemById,
  generateId,
  normalizeAction,
  updateItemImmutable,
} from "./menu-engine";

type HeaderStoreState = {
  workspace: HeaderWorkspace;
  savedFingerprint: string;
};

export const useHeaderStore = create<HeaderStoreState>(() => ({
  workspace: createDefaultWorkspace(),
  savedFingerprint: "",
}));

function serializeWorkspaceFromState(w: HeaderWorkspace): Record<string, unknown> {
  return {
    menusDatabase: w.menusDatabase,
    activeMenuKey: w.activeMenuKey,
    brandingState: w.branding,
    headerActions: w.headerActions,
    settings: w.settings,
  };
}

function getWorkspace(): HeaderWorkspace {
  return useHeaderStore.getState().workspace;
}

export function useHeaderWorkspace(): HeaderWorkspace {
  return useHeaderStore((s) => s.workspace);
}

export function useHeaderWorkspaceIsDirty(): boolean {
  return useHeaderStore((s) => {
    if (!s.savedFingerprint) return false;
    return JSON.stringify(serializeWorkspaceFromState(s.workspace)) !== s.savedFingerprint;
  });
}

export function useActiveMenu(): MenuRecord | undefined {
  return useHeaderStore((s) => s.workspace.menusDatabase[s.workspace.activeMenuKey]);
}

export function markWorkspaceSaved(): void {
  useHeaderStore.setState({
    savedFingerprint: JSON.stringify(serializeWorkspaceFromState(getWorkspace())),
  });
}

export function getSavedWorkspaceBaseline(): Record<string, unknown> {
  const saved = useHeaderStore.getState().savedFingerprint;
  if (saved) {
    try {
      return JSON.parse(saved) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  return serializeWorkspaceFromState(getWorkspace());
}

export function setWorkspace(next: HeaderWorkspace): void {
  useHeaderStore.setState({ workspace: next });
}

export function patchWorkspace(patch: Partial<HeaderWorkspace>): void {
  useHeaderStore.setState({ workspace: { ...getWorkspace(), ...patch } });
}

export function setActiveMenuKey(key: string): void {
  const w = getWorkspace();
  if (!w.menusDatabase[key]) return;
  patchWorkspace({ activeMenuKey: key });
}

export function setSettings(settings: Partial<HeaderBuilderSettings>): void {
  const w = getWorkspace();
  patchWorkspace({ settings: { ...w.settings, ...settings } });
}

export function setBranding(branding: Partial<BrandingState>): void {
  const w = getWorkspace();
  patchWorkspace({ branding: normalizeBranding({ ...w.branding, ...branding }) });
}

export function setMenuGlobalApply(menuKey: string, globalApply: GlobalApply): void {
  const w = getWorkspace();
  const menu = w.menusDatabase[menuKey];
  if (!menu) return;
  patchWorkspace({
    menusDatabase: {
      ...w.menusDatabase,
      [menuKey]: { ...menu, globalApply },
    },
  });
}

export function setMenuGlobalApplyWithConflictCheck(
  menuKey: string,
  globalApply: GlobalApply
): { clearedConflicts: string[] } {
  const w = getWorkspace();
  const menu = w.menusDatabase[menuKey];
  if (!menu) return { clearedConflicts: [] };

  const coversDesktop = globalApply === "Desktop" || globalApply === "Both";
  const coversMobile = globalApply === "Mobile" || globalApply === "Both";

  const clearedConflicts: string[] = [];
  const updatedMenus: Record<string, MenuRecord> = { ...w.menusDatabase };

  for (const [key, m] of Object.entries(w.menusDatabase)) {
    if (key === menuKey) continue;
    const existingDesktop = m.globalApply === "Desktop" || m.globalApply === "Both";
    const existingMobile = m.globalApply === "Mobile" || m.globalApply === "Both";
    if ((coversDesktop && existingDesktop) || (coversMobile && existingMobile)) {
      clearedConflicts.push(m.name);
      updatedMenus[key] = { ...m, globalApply: "none" };
    }
  }

  updatedMenus[menuKey] = { ...menu, globalApply };
  patchWorkspace({ menusDatabase: updatedMenus });
  return { clearedConflicts };
}

export function duplicateMenu(key: string): string {
  const w = getWorkspace();
  const source = w.menusDatabase[key];
  if (!source) return "";
  const newKey = `menu_${Date.now()}`;
  patchWorkspace({
    menusDatabase: {
      ...w.menusDatabase,
      [newKey]: {
        name: `${source.name} (Copy)`,
        items: JSON.parse(JSON.stringify(source.items)),
        globalApply: "none",
      },
    },
    activeMenuKey: newKey,
  });
  return newKey;
}

export function renameMenu(key: string, name: string): void {
  const w = getWorkspace();
  const menu = w.menusDatabase[key];
  if (!menu || !name.trim()) return;
  patchWorkspace({
    menusDatabase: { ...w.menusDatabase, [key]: { ...menu, name: name.trim() } },
  });
}

export function moveRootItemUp(itemId: string): void {
  const w = getWorkspace();
  const menu = w.menusDatabase[w.activeMenuKey];
  if (!menu) return;
  const idx = menu.items.findIndex((i) => i.id === itemId);
  if (idx <= 0) return;
  const items = [...menu.items];
  [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
  patchWorkspace({
    menusDatabase: { ...w.menusDatabase, [w.activeMenuKey]: { ...menu, items } },
  });
}

export function moveRootItemDown(itemId: string): void {
  const w = getWorkspace();
  const menu = w.menusDatabase[w.activeMenuKey];
  if (!menu) return;
  const idx = menu.items.findIndex((i) => i.id === itemId);
  if (idx < 0 || idx >= menu.items.length - 1) return;
  const items = [...menu.items];
  [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
  patchWorkspace({
    menusDatabase: { ...w.menusDatabase, [w.activeMenuKey]: { ...menu, items } },
  });
}

export function createMenu(name: string): string {
  const key = `menu_${Date.now()}`;
  const w = getWorkspace();
  patchWorkspace({
    menusDatabase: {
      ...w.menusDatabase,
      [key]: { name, items: [], globalApply: "none" },
    },
    activeMenuKey: key,
  });
  return key;
}

export function deleteMenu(key: string): boolean {
  if (key === "mainMenu") return false;
  const w = getWorkspace();
  if (!w.menusDatabase[key]) return false;
  const { [key]: _, ...rest } = w.menusDatabase;
  const nextActive = w.activeMenuKey === key ? Object.keys(rest)[0] ?? "mainMenu" : w.activeMenuKey;
  patchWorkspace({ menusDatabase: rest, activeMenuKey: nextActive });
  return true;
}

export function replaceMenuFromImport(menuKey: string, menu: MenuRecord): void {
  const w = getWorkspace();
  patchWorkspace({
    menusDatabase: { ...w.menusDatabase, [menuKey]: menu },
  });
}

export function importMenuJsonFile(menuKey: string, data: unknown): boolean {
  try {
    const o = data as { menu?: MenuRecord };
    if (o?.menu && typeof o.menu === "object" && Array.isArray(o.menu.items)) {
      replaceMenuFromImport(menuKey, o.menu);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function addRootItem(item: MenuItem): void {
  const w = getWorkspace();
  const menu = w.menusDatabase[w.activeMenuKey];
  if (!menu) return;
  patchWorkspace({
    menusDatabase: {
      ...w.menusDatabase,
      [w.activeMenuKey]: { ...menu, items: [...menu.items, item] },
    },
  });
}

export function addChildItem(parentId: string, child: MenuItem): void {
  const w = getWorkspace();
  const menu = w.menusDatabase[w.activeMenuKey];
  if (!menu) return;
  if (!findItemById(menu.items, parentId)) return;
  let items = addChildImmutable(menu.items, parentId, child);
  items = updateItemImmutable(items, parentId, (parent) => ({
    ...parent,
    megaMenuType: parent.megaMenuType ?? DEFAULT_FLYOUT_MENU_TYPE,
  }));
  patchWorkspace({
    menusDatabase: {
      ...w.menusDatabase,
      [w.activeMenuKey]: {
        ...menu,
        items,
      },
    },
  });
}

export function removeItem(itemId: string): void {
  const w = getWorkspace();
  const menu = w.menusDatabase[w.activeMenuKey];
  if (!menu) return;
  patchWorkspace({
    menusDatabase: {
      ...w.menusDatabase,
      [w.activeMenuKey]: { ...menu, items: deleteItemImmutable(menu.items, itemId) },
    },
  });
}

export function updateMenuItem(itemId: string, next: Partial<MenuItem>): void {
  const w = getWorkspace();
  const menu = w.menusDatabase[w.activeMenuKey];
  if (!menu) return;
  patchWorkspace({
    menusDatabase: {
      ...w.menusDatabase,
      [w.activeMenuKey]: {
        ...menu,
        items: updateItemImmutable(menu.items, itemId, (item) => ({ ...item, ...next })),
      },
    },
  });
}

export function replaceMenuItem(itemId: string, next: MenuItem): void {
  const w = getWorkspace();
  const menu = w.menusDatabase[w.activeMenuKey];
  if (!menu) return;
  patchWorkspace({
    menusDatabase: {
      ...w.menusDatabase,
      [w.activeMenuKey]: {
        ...menu,
        items: updateItemImmutable(menu.items, itemId, (old) => ({
          ...next,
          id: old.id,
          children: old.children,
        })),
      },
    },
  });
}

export function setHeaderActions(actions: HeaderAction[]): void {
  patchWorkspace({ headerActions: actions });
}

export function upsertAction(action: HeaderAction): void {
  const w = getWorkspace();
  const idx = w.headerActions.findIndex((a) => a.id === action.id);
  if (idx >= 0) {
    const copy = [...w.headerActions];
    copy[idx] = action;
    patchWorkspace({ headerActions: copy });
  } else {
    patchWorkspace({ headerActions: [...w.headerActions, action] });
  }
}

export function removeAction(id: string): void {
  const w = getWorkspace();
  patchWorkspace({ headerActions: w.headerActions.filter((a) => a.id !== id) });
}

export function toggleActionVisibility(id: string): void {
  const w = getWorkspace();
  patchWorkspace({
    headerActions: w.headerActions.map((a) => (a.id === id ? { ...a, visible: !a.visible } : a)),
  });
}

export function applyImportedPayload(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const o = data as Record<string, unknown>;
  const merged = mergeWorkspaceImport({
    menusDatabase: o.menusDatabase,
    activeMenuKey: o.activeMenuKey,
    brandingState: o.brandingState,
    branding: o.branding,
    headerActions: o.headerActions,
    settings: o.settings,
  });
  if (Array.isArray(o.headerActions)) {
    merged.headerActions = o.headerActions.map((a) => normalizeAction(a as HeaderAction));
  }
  useHeaderStore.setState({ workspace: merged });
}

/** Sync store before first paint so SSR and hydration share the same workspace snapshot. */
export function hydrateHeaderWorkspace(workspace: HeaderWorkspace): void {
  setWorkspace(workspace);
  markWorkspaceSaved();
}

export function serializeWorkspace(): Record<string, unknown> {
  return serializeWorkspaceFromState(getWorkspace());
}

export function exportWorkspaceBlob(): Blob {
  return new Blob([JSON.stringify(serializeWorkspace(), null, 2)], { type: "application/json" });
}

export function generateActionId(): string {
  return generateId();
}
