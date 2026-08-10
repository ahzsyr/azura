"use client";

import { useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HelpBlockRenderer } from "@/features/help/components/help-block-renderer";
import { HelpRelatedTasks } from "@/features/help/components/help-related-tasks";
import { HelpBadges } from "@/features/help/components/help-badges";
import { formatReadingTime } from "@/features/help/lib/format-reading-time";
import { resolveTopicNavSequence } from "@/features/help/lib/topic-status";
import { helpRegistry } from "@/features/help/data/registry";
import type { HelpTopic } from "@/features/help/types";

export function HelpTopicDetailSheet({
  topic,
  sectionTopicIds,
  open,
  onOpenChange,
  onNavigateTopic,
  onCloseFocus,
}: {
  topic: HelpTopic | null;
  sectionTopicIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateTopic: (topicId: string) => void;
  onCloseFocus?: () => void;
}) {
  const sequence = useMemo(() => {
    if (!topic) return [];
    return resolveTopicNavSequence(topic.id, sectionTopicIds);
  }, [topic, sectionTopicIds]);

  const index = topic ? sequence.indexOf(topic.id) : -1;
  const prevId = index > 0 ? sequence[index - 1] : null;
  const nextId = index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null;
  const prevTopic = prevId ? helpRegistry.topicsById.get(prevId) : null;
  const nextTopic = nextId ? helpRegistry.topicsById.get(nextId) : null;

  useEffect(() => {
    if (!open && onCloseFocus) {
      // defer until sheet unmount animation starts
      const t = window.setTimeout(() => onCloseFocus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, onCloseFocus]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        {topic && (
          <>
            <SheetHeader className="space-y-3 text-start">
              <SheetTitle>{topic.title}</SheetTitle>
              <SheetDescription>{topic.summary}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatReadingTime(topic.readingTime)}
                </span>
                <HelpBadges badges={topic.badges} difficulty={topic.difficulty} />
              </div>
            </SheetHeader>

            <div className="mt-6 flex-1 space-y-6 pb-8">
              <HelpBlockRenderer blocks={topic.content} topicId={topic.id} />
              <HelpRelatedTasks
                workflowIds={topic.relatedWorkflowIds}
                onOpenTopic={onNavigateTopic}
              />
            </div>

            <div className="sticky bottom-0 -mx-6 mt-auto flex items-center justify-between gap-2 border-t bg-background px-6 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!prevTopic}
                onClick={() => prevId && onNavigateTopic(prevId)}
                className="max-w-[45%] truncate"
              >
                ← {prevTopic?.title ?? "Previous"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!nextTopic}
                onClick={() => nextId && onNavigateTopic(nextId)}
                className="max-w-[45%] truncate"
              >
                {nextTopic?.title ?? "Next"} →
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
