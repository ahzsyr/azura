"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  setNavSearchQuery: (query: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLastUpdated: (date: Date | null) => void;
  registerPageActions: (actions: PageActions) => void;
  clearPageActions: () => void;
  setSettingsActiveTab: (tab: string | null) => void;
  markUnsaved: () => void;
  markSaved: () => void;
};

const DEFAULT_EXPANDED: Record<string, boolean> = {
  content: true,
  travel: true,
  design: true,
  seo: true,
  system: true,
};

export const useAdminUiStore = create<AdminUiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      expandedGroups: DEFAULT_EXPANDED,
      navSearchQuery: "",
      saveStatus: "saved",
      lastUpdated: null,
      pageActions: {},
      settingsActiveTab: null,

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
      toggleGroupExpanded: (groupId) =>
        set((s) => ({
          expandedGroups: {
            ...s.expandedGroups,
            [groupId]: !s.expandedGroups[groupId],
          },
        })),
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
      name: "admin-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedGroups: state.expandedGroups,
      }),
    }
  )
);
