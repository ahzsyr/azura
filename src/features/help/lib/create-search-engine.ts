import type { HelpRegistry, HelpSearchEngine, HelpSearchHit } from "@/features/help/types";

function matches(index: string | undefined, query: string): boolean {
  if (!index) return false;
  return index.includes(query);
}

/** v1 substring engine — swap implementation later without changing UI. */
export function createSubstringSearchEngine(registry: HelpRegistry): HelpSearchEngine {
  return {
    search(rawQuery: string): HelpSearchHit[] {
      const query = rawQuery.trim().toLowerCase();
      if (!query) return [];

      const hits: HelpSearchHit[] = [];

      for (const section of registry.sections) {
        if (matches(section.searchIndex, query)) {
          hits.push({
            kind: "section",
            id: section.id,
            title: section.title,
            summary: section.description,
          });
        }
        for (const topic of section.topics) {
          if (matches(topic.searchIndex, query) || topic.title.toLowerCase().includes(query)) {
            hits.push({
              kind: "topic",
              id: topic.id,
              title: topic.title,
              summary: topic.summary,
              sectionId: section.id,
            });
          }
        }
      }

      for (const workflow of registry.workflows) {
        if (matches(workflow.searchIndex, query)) {
          hits.push({
            kind: "workflow",
            id: workflow.id,
            title: workflow.title,
            summary: workflow.summary,
          });
        }
      }

      for (const checklist of registry.checklists) {
        if (matches(checklist.searchIndex, query)) {
          hits.push({
            kind: "checklist",
            id: checklist.id,
            title: checklist.title,
            summary: checklist.summary,
          });
        }
      }

      for (const faq of registry.faqs) {
        if (matches(faq.searchIndex, query)) {
          hits.push({
            kind: "faq",
            id: faq.id,
            title: faq.question,
            summary: faq.answer,
          });
        }
      }

      for (const item of registry.troubleshooting) {
        if (matches(item.searchIndex, query)) {
          hits.push({
            kind: "troubleshooting",
            id: item.id,
            title: item.title,
            summary: item.problem,
          });
        }
      }

      return hits;
    },
  };
}

export function createHelpSearchEngine(registry: HelpRegistry): HelpSearchEngine {
  return createSubstringSearchEngine(registry);
}
