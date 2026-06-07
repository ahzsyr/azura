"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ADMIN_NAV_GROUP_IDS } from "@/config/admin-nav";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

export type PageActions = {
  onSave?: () => void | Promise<void>;
  onRebuildIndex?: () => void | Promise<void>;
  rebuildIndexLabel?: string;
  onPublish?: () => void | Promise<void>;
  onPreview?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canPublish?: boolean;
  canPreview?: boolean;
};

type AdminUiState = {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  expandedGroups: Record<string, boolean>;
  navSearchQuery: string;
  saveStatus: SaveStatus;
  lastUpdated: Date | null;
  pageActions: PageActions;
  settingsActiveTab: string | null;

  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  toggleGroupExpanded: (groupId: string) => void;
  setGroupExpanded: (groupId: string, expanded: boolean) => void;
  /** Accordion: open one group, close all others. Pass null to close all. */
  expandOnlyNavGroup: (groupId: string | null) => void;
  setNavSearchQuery: (query: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLastUpdated: (date: Date | null) => void;
  registerPageActions: (actions: PageActions) => void;
  clearPageActions: () => void;
  setSettingsActiveTab: (tab: string | null) => void;
  markUnsaved: () => void;
  markSaved: () => void;
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
      lastUpdated: null,
      pageActions: {},
      settingsActiveTab: null,

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
      setLastUpdated: (date) => set({ lastUpdated: date }),
      registerPageActions: (actions) => set({ pageActions: actions }),
      clearPageActions: () => set({ pageActions: {}, saveStatus: "saved" }),
      setSettingsActiveTab: (tab) => set({ settingsActiveTab: tab }),
      markUnsaved: () => {
        if (get().saveStatus !== "saving") set({ saveStatus: "unsaved" });
      },
      markSaved: () => set({ saveStatus: "saved", lastUpdated: new Date() }),
    }),
    {
      name: "admin-ui-v2",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedGroups: state.expandedGroups,
      }),
    }
  )
);
