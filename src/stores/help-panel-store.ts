"use client";

import { create } from "zustand";
import { helpRegistry } from "@/features/help/data/registry";
import { trackHelpEvent } from "@/features/help/lib/analytics";
import { pushRecentTopicId } from "@/features/help/lib/help-persistence";

type HelpPanelState = {
  topicId: string | null;
  open: boolean;
  openTopic: (topicId: string) => void;
  closePanel: () => void;
  setOpen: (open: boolean) => void;
};

export const useHelpPanelStore = create<HelpPanelState>((set) => ({
  topicId: null,
  open: false,
  openTopic: (topicId) => {
    if (!helpRegistry.topicsById.has(topicId)) return;
    pushRecentTopicId(topicId);
    trackHelpEvent({ name: "help_topic_viewed", topicId });
    set({ topicId, open: true });
  },
  closePanel: () => set({ open: false, topicId: null }),
  setOpen: (open) => {
    if (!open) set({ open: false, topicId: null });
    else set({ open: true });
  },
}));
