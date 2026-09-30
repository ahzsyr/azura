"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ADMIN_NAV_GROUP_IDS } from "@/config/admin-nav";
import {
  deriveActiveFromStack,
  removeStackEntry,
  upsertStackEntry,
  validatePageActionsInDev,
  type ActionStackEntry,
  type PageActionOwner,
} from "@/stores/admin-action-registry";
export type { PageActionOwner, ActionStackEntry } from "@/stores/admin-action-registry";
export {
  getRegisteredActionKeys,
  getEnabledActionKeys,
} from "@/stores/admin-action-registry";

export const ADMIN_NAV_SECTION_IDS = [
  "content:overview",
  "content:core",
  "content:catalog",
  "content:organization",
  "content:assets",
  "seo:dashboard",
  "seo:tasks",
  "seo:audit",
  "seo:basic",
  "seo:advanced",
] as const;

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";
export type PublishStatus = "live" | "pending" | "publishing" | "error";

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
  /**
   * When true (or saveStatusMode === "self-managed"), the page handler manages saveStatus;
   * top bar will not overwrite after onSave.
   * @deprecated Prefer saveStatusMode: "self-managed"
   */
  selfManagedSaveStatus?: boolean;
  /** Preferred status ownership. Default "automatic". */
  saveStatusMode?: "automatic" | "self-managed";
  onCancel?: () => void | Promise<void>;
  cancelLabel?: string;
  /** When omitted, Cancel is shown only while saveStatus is unsaved or error. */
  canCancel?: boolean;
};

/** True when the page owns save status (legacy flag or saveStatusMode). */
export function isSelfManagedSaveStatus(actions: PageActions): boolean {
  return (
    actions.saveStatusMode === "self-managed" ||
    actions.selfManagedSaveStatus === true
  );
}

type AdminUiState = {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  expandedGroups: Record<string, boolean>;
  expandedSections: Record<string, boolean>;
  navSearchQuery: string;
  saveStatus: SaveStatus;
  publishStatus: PublishStatus;
  lastUpdated: Date | null;
  /** Active (highest-priority) page actions — derived from actionStack. */
  pageActions: PageActions;
  /** Registration stack; higher priority is active. */
  actionStack: ActionStackEntry[];
  /** Owner of the currently active actions. */
  activeOwner: PageActionOwner | null;
  settingsActiveTab: string | null;
  /** Set when markUnsaved is called while saveStatus is "saving". */
  pendingDirty: boolean;
  patchMeta: PatchMeta;

  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  toggleGroupExpanded: (groupId: string) => void;
  toggleSectionExpanded: (sectionId: string) => void;
  setGroupExpanded: (groupId: string, expanded: boolean) => void;
  /** Accordion: open one group, close all others. Pass null to close all. */
  expandOnlyNavGroup: (groupId: string | null) => void;
  setNavSearchQuery: (query: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setPublishStatus: (status: PublishStatus) => void;
  markPublishPending: () => void;
  markPublished: () => void;
  setLastUpdated: (date: Date | null) => void;
  /**
   * Stack-aware registration. Prefer useAdminPageActions / registerAdminPageActions.
   * Legacy registerPageActions remains for migration compatibility.
   */
  registerAdminPageActions: (actions: PageActions, owner: PageActionOwner) => void;
  unregisterAdminPageActions: (ownerId: string) => void;
  /**
   * @deprecated Use registerAdminPageActions with an owner. Legacy: replaces entire stack with a single anonymous entry.
   */
  registerPageActions: (actions: PageActions) => void;
  /**
   * @deprecated Use unregisterAdminPageActions(ownerId). Legacy: clears entire stack.
   */
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

function closedSectionsState(): Record<string, boolean> {
  return Object.fromEntries(ADMIN_NAV_SECTION_IDS.map((id) => [id, false]));
}

const LEGACY_OWNER_ID = "__legacy__";

function applyStack(set: (partial: Partial<AdminUiState>) => void, stack: ActionStackEntry[]) {
  const { pageActions, activeOwner } = deriveActiveFromStack(stack);
  set({ actionStack: stack, pageActions, activeOwner });
}

export const useAdminUiStore = create<AdminUiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      expandedGroups: closedGroupsState(),
      expandedSections: closedSectionsState(),
      navSearchQuery: "",
      saveStatus: "saved",
      publishStatus: "live",
      lastUpdated: null,
      pageActions: {},
      actionStack: [],
      activeOwner: null,
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
      toggleSectionExpanded: (sectionId) =>
        set((s) => ({
          expandedSections: {
            ...s.expandedSections,
            [sectionId]: !(s.expandedSections[sectionId] === true),
          },
        })),
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

      registerAdminPageActions: (actions, owner) => {
        validatePageActionsInDev(actions, owner);
        const stack = upsertStackEntry(get().actionStack, { owner, actions });
        applyStack(set, stack);
      },

      unregisterAdminPageActions: (ownerId) => {
        const stack = get().actionStack;
        if (!stack.some((e) => e.owner.id === ownerId)) {
          return;
        }
        const next = removeStackEntry(stack, ownerId);
        applyStack(set, next);
        if (next.length === 0) {
          get().resetSaveStatus();
        }
      },

      registerPageActions: (actions) => {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[Admin Action System] registerPageActions is deprecated; use useAdminPageActions.",
          );
        }
        const owner: PageActionOwner = {
          id: LEGACY_OWNER_ID,
          ownerKey: "legacy",
          scope: "legacy",
          priority: 0,
        };
        validatePageActionsInDev(actions, owner);
        // Legacy replaces the whole stack with one entry (old behavior).
        applyStack(set, [{ owner, actions }]);
      },

      clearPageActions: () => {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[Admin Action System] clearPageActions is deprecated; use unregisterAdminPageActions(ownerId).",
          );
        }
        applyStack(set, []);
        get().resetSaveStatus();
      },

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
      // v3: custom merge so stale localStorage never wipes runtime pageActions.
      name: "admin-ui-v3",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedGroups: state.expandedGroups,
        expandedSections: state.expandedSections,
      }),
      // Only rehydrate persisted UI chrome — never saveStatus / pageActions / etc.
      merge: (persistedState, currentState) => {
        const p = persistedState as
          | Partial<
              Pick<AdminUiState, "sidebarCollapsed" | "expandedGroups" | "expandedSections">
            >
          | undefined;
        if (!p) return currentState;
        return {
          ...currentState,
          sidebarCollapsed: p.sidebarCollapsed ?? currentState.sidebarCollapsed,
          expandedGroups: p.expandedGroups ?? currentState.expandedGroups,
          expandedSections: p.expandedSections ?? currentState.expandedSections,
        };
      },
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
  if (isSelfManagedSaveStatus(pageActions)) return;
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
