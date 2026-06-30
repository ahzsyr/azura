"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ADMIN_NAV_GROUP_IDS } from "@/config/admin-nav";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";
export type PublishStatus = "live" | "pending" | "publishing";

export type PatchMeta = {
  dirtyPaths: string[];
  dirtyFieldsCount: number;
  changedSections: string[];
  baselineRevision: number;
};

export const EMPTY_PATCH_META: PatchMeta = {
  dirtyPaths: [],
  dirtyFieldsCount: 0,
  changedSections: [],
  baselineRevision: 0,
};

export type PageActions = {
  onSave?: () => boolean | void | Promise<boolean | void>;
  saveLabel?: string;
  saveTooltip?: string;
  canSave?: boolean;
  onUpdate?: () => void | Promise<void>;
  updateLabel?: string;
  updateTooltip?: string;
  canUpdate?: boolean;
  onRebuildIndex?: () => void | Promise<void>;
  rebuildIndexLabel?: string;
  onPublish?: () => boolean | void | Promise<boolean | void>;
  publishLabel?: string;
  publishTooltip?: string;
  onPreview?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canPublish?: boolean;
  canPreview?: boolean;
  /** When false, onSave success does not change the top-bar status (e.g. preview-only Validate). */
  markSavedOnSaveSuccess?: boolean;
  /** When true, the page handler manages saveStatus; top bar will not overwrite after onSave. */
  selfManagedSaveStatus?: boolean;
  onCancel?: () => void | Promise<void>;
  cancelLabel?: string;
  /** When omitted, Cancel is shown only while saveStatus is unsaved or error. */
  canCancel?: boolean;
};

type AdminUiState = {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  expandedGroups: Record<string, boolean>;
  navSearchQuery: string;
  saveStatus: SaveStatus;
  publishStatus: PublishStatus;
  lastUpdated: Date | null;
  pageActions: PageActions;
  settingsActiveTab: string | null;
  /** Set when markUnsaved is called while saveStatus is "saving". */
  pendingDirty: boolean;
  patchMeta: PatchMeta;

  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  toggleGroupExpanded: (groupId: string) => void;
  setGroupExpanded: (groupId: string, expanded: boolean) => void;
  /** Accordion: open one group, close all others. Pass null to close all. */
  expandOnlyNavGroup: (groupId: string | null) => void;
  setNavSearchQuery: (query: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setPublishStatus: (status: PublishStatus) => void;
  markPublishPending: () => void;
  markPublished: () => void;
  setLastUpdated: (date: Date | null) => void;
  registerPageActions: (actions: PageActions) => void;
  clearPageActions: () => void;
  resetSaveStatus: () => void;
  setSettingsActiveTab: (tab: string | null) => void;
  markUnsaved: () => void;
  markSaved: () => void;
  consumePendingDirty: () => boolean;
  setPatchMeta: (meta: PatchMeta) => void;
  clearPatchMeta: () => void;
  bumpBaselineRevision: () => void;
};

function closedGroupsState(): Record<string, boolean> {
  return Object.fromEntries(ADMIN_NAV_GROUP_IDS.map((id) => [id, false]));
}

export const useAdminUiStore = create<AdminUiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      expandedGroups: closedGroupsState(),
      navSearchQuery: "",
      saveStatus: "saved",
      publishStatus: "live",
      lastUpdated: null,
      pageActions: {},
      settingsActiveTab: null,
      pendingDirty: false,
      patchMeta: EMPTY_PATCH_META,

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
      expandOnlyNavGroup: (groupId) =>
        set(() => {
          const next = closedGroupsState();
          if (groupId) next[groupId] = true;
          return { expandedGroups: next };
        }),
      toggleGroupExpanded: (groupId) => {
        const isOpen = get().expandedGroups[groupId] === true;
        if (isOpen) {
          set({ expandedGroups: { ...get().expandedGroups, [groupId]: false } });
          return;
        }
        const next = closedGroupsState();
        next[groupId] = true;
        set({ expandedGroups: next });
      },
      setGroupExpanded: (groupId, expanded) =>
        set((s) => ({
          expandedGroups: { ...s.expandedGroups, [groupId]: expanded },
        })),
      setNavSearchQuery: (query) => set({ navSearchQuery: query }),
      setSaveStatus: (status) => set({ saveStatus: status }),
      setPublishStatus: (status) => set({ publishStatus: status }),
      markPublishPending: () => set({ publishStatus: "pending" }),
      markPublished: () => set({ publishStatus: "live", lastUpdated: new Date() }),
      setLastUpdated: (date) => set({ lastUpdated: date }),
      registerPageActions: (actions) => set({ pageActions: actions }),
      clearPageActions: () => set({ pageActions: {} }),
      resetSaveStatus: () =>
        set({
          saveStatus: "saved",
          publishStatus: "live",
          pendingDirty: false,
          patchMeta: EMPTY_PATCH_META,
        }),
      setSettingsActiveTab: (tab) => set({ settingsActiveTab: tab }),
      markUnsaved: () => {
        if (get().saveStatus === "saving") {
          set({ pendingDirty: true });
          return;
        }
        set({ saveStatus: "unsaved" });
      },
      markSaved: () =>
        set({
          saveStatus: "saved",
          lastUpdated: new Date(),
          pendingDirty: false,
          patchMeta: EMPTY_PATCH_META,
        }),
      consumePendingDirty: () => {
        const hadPending = get().pendingDirty;
        if (hadPending) set({ pendingDirty: false });
        return hadPending;
      },
      setPatchMeta: (meta) => set({ patchMeta: meta }),
      clearPatchMeta: () => set({ patchMeta: EMPTY_PATCH_META }),
      bumpBaselineRevision: () =>
        set((s) => ({
          patchMeta: {
            ...EMPTY_PATCH_META,
            baselineRevision: s.patchMeta.baselineRevision + 1,
          },
        })),
    }),
    {
      name: "admin-ui-v2",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedGroups: state.expandedGroups,
      }),
      skipHydration: true,
    }
  )
);

/** Apply top-bar save result to global save status. */
export function applySaveResult(
  ok: boolean | void,
  pageActions: PageActions,
  actions: {
    setSaveStatus: (status: SaveStatus) => void;
    markSaved: () => void;
    consumePendingDirty: () => boolean;
  }
): void {
  if (pageActions.selfManagedSaveStatus) return;
  if (ok === false) {
    actions.setSaveStatus("unsaved");
    return;
  }
  if (pageActions.markSavedOnSaveSuccess === false) {
    return;
  }
  if (actions.consumePendingDirty()) {
    actions.setSaveStatus("unsaved");
    return;
  }
  actions.markSaved();
}
