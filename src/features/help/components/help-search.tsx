"use client";

import { useMemo } from "react";
import { HelpTaskCard } from "@/features/help/components/help-task-card";
import { helpRegistry } from "@/features/help/data/registry";
import type { HelpSearchHit } from "@/features/help/types";

type Group = { key: string; title: string; hits: HelpSearchHit[] };

function groupHits(hits: HelpSearchHit[]): Group[] {
  const map = new Map<string, Group>();

  for (const hit of hits) {
    let key: string;
    let title: string;

    if (hit.kind === "topic" || hit.kind === "section") {
      const sectionId =
        hit.kind === "section" ? hit.id : hit.sectionId ?? helpRegistry.topicSectionId.get(hit.id);
      const section = sectionId ? helpRegistry.sectionsById.get(sectionId) : undefined;
      key = sectionId ?? "other";
      title = section?.title ?? "Guides";
    } else if (hit.kind === "workflow") {
      key = "workflows";
      title = "Workflows";
    } else if (hit.kind === "checklist") {
      key = "checklists";
      title = "Checklists";
    } else if (hit.kind === "faq") {
      key = "faq";
      title = "FAQ";
    } else {
      key = "troubleshooting";
      title = "Troubleshooting";
    }

    const group = map.get(key) ?? { key, title, hits: [] };
    group.hits.push(hit);
    map.set(key, group);
  }

  return [...map.values()];
}

export function HelpSearchResults({
  hits,
  onOpenHit,
}: {
  hits: HelpSearchHit[];
  onOpenHit: (hit: HelpSearchHit) => void;
}) {
  const groups = useMemo(() => groupHits(hits), [hits]);

  if (!hits.length) {
    return <p className="text-sm text-muted-foreground">No matching help topics.</p>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-medium">Search results</h2>
      {groups.map((group) => (
        <div key={group.key} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{group.title}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {group.hits.map((hit) => (
              <HelpTaskCard
                key={`${hit.kind}-${hit.id}`}
                id={`search-${hit.id}`}
                title={hit.title}
                summary={hit.summary ?? hit.kind}
                onViewGuide={() => onOpenHit(hit)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
