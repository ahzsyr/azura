"use client";

import { HelpBlockRenderer } from "@/features/help/components/help-block-renderer";
import { HelpRelatedTasks } from "@/features/help/components/help-related-tasks";
import { HelpTaskCard } from "@/features/help/components/help-task-card";
import { helpRegistry } from "@/features/help/data/registry";
import {
  inferTopicStatus,
  resolvePrimaryTopicLink,
} from "@/features/help/lib/topic-status";
import type { HelpSection } from "@/features/help/types";

/** Used by mobile accordion / lazy detail paths. */
export function HelpSectionBody({
  section,
  onOpenTopic,
  highlightedTopicId,
}: {
  section: HelpSection;
  onOpenTopic: (topicId: string) => void;
  highlightedTopicId?: string | null;
}) {
  return (
    <div className="space-y-4">
      {section.topics.map((topic) => {
        const link = resolvePrimaryTopicLink(topic);
        return (
          <div key={topic.id} id={topic.id} className="scroll-mt-24 space-y-3">
            <HelpTaskCard
              id={topic.id}
              title={topic.title}
              summary={topic.summary}
              readingTime={topic.readingTime}
              difficulty={topic.difficulty}
              status={inferTopicStatus(topic)}
              primaryHref={link?.href}
              primaryLabel={link?.label}
              highlighted={highlightedTopicId === topic.id}
              onViewGuide={() => onOpenTopic(topic.id)}
            />
            <HelpBlockRenderer blocks={topic.content} topicId={topic.id} />
            <HelpRelatedTasks workflowIds={topic.relatedWorkflowIds} onOpenTopic={onOpenTopic} />
            {topic.relatedTopicIds && topic.relatedTopicIds.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Related topics:{" "}
                {topic.relatedTopicIds.map((id, index) => {
                  const relatedTopic = helpRegistry.topicsById.get(id);
                  if (!relatedTopic) return null;
                  return (
                    <span key={id}>
                      {index > 0 && ", "}
                      <button
                        type="button"
                        className="text-primary underline-offset-2 hover:underline"
                        onClick={() => onOpenTopic(id)}
                      >
                        {relatedTopic.title}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
