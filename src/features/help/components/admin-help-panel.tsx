"use client";

import { useEffect } from "react";
import { HelpTopicDetailSheet } from "@/features/help/components/help-topic-detail-sheet";
import { helpRegistry } from "@/features/help/data/registry";
import { useHelpPanelStore } from "@/stores/help-panel-store";

export function AdminHelpPanel() {
  const topicId = useHelpPanelStore((s) => s.topicId);
  const open = useHelpPanelStore((s) => s.open);
  const openTopic = useHelpPanelStore((s) => s.openTopic);
  const setOpen = useHelpPanelStore((s) => s.setOpen);

  const topic = topicId ? (helpRegistry.topicsById.get(topicId) ?? null) : null;
  const sectionId = topicId ? helpRegistry.topicSectionId.get(topicId) : null;
  const section = sectionId ? helpRegistry.sectionsById.get(sectionId) : null;
  const sectionTopicIds = section?.topics.map((t) => t.id) ?? [];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !open) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  return (
    <HelpTopicDetailSheet
      topic={topic}
      sectionTopicIds={sectionTopicIds}
      open={open && Boolean(topic)}
      onOpenChange={setOpen}
      onNavigateTopic={openTopic}
    />
  );
}
