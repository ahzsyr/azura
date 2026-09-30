"use client";

import type { HelpTopic } from "@/features/help/types";

export function HelpRecentGuides({
  topics,
  onOpenTopic,
}: {
  topics: HelpTopic[];
  onOpenTopic: (topicId: string) => void;
}) {
  if (!topics.length) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Recently Viewed</h2>
      <ul className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <li key={topic.id}>
            <button
              type="button"
              onClick={() => onOpenTopic(topic.id)}
              className="rounded-full border bg-background px-3 py-1 text-sm hover:bg-muted"
            >
              {topic.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
