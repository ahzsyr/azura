import type {
  HelpBlock,
  HelpChecklist,
  HelpFaq,
  HelpRegistry,
  HelpSection,
  HelpTopic,
  HelpTroubleshooting,
  HelpWorkflow,
} from "@/features/help/types";

function blocksToText(blocks: HelpBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
      case "warning":
      case "tip":
      case "purpose":
      case "heading":
        parts.push(block.type === "heading" ? block.text : block.text);
        break;
      case "steps":
      case "when_to_use":
      case "prerequisites":
      case "best_practices":
      case "mistakes":
        parts.push(...block.items);
        break;
      case "diagram":
        parts.push(...block.steps);
        break;
      case "links":
        for (const item of block.items) {
          parts.push(item.label, item.href);
        }
        break;
      case "faq":
        for (const item of block.items) {
          parts.push(item.question, item.answer);
        }
        break;
      case "checklist":
        parts.push(block.checklistId);
        break;
      case "field":
        parts.push(
          block.name,
          block.purpose,
          block.recommended ?? "",
          block.example ?? "",
          ...(block.mistakes ?? [])
        );
        break;
      case "overview_item":
        parts.push(block.title, block.description);
        break;
      case "troubleshooting_list":
        for (const item of block.items) {
          parts.push(item.problem, ...item.causes, ...item.fixes);
        }
        break;
      default:
        break;
    }
  }
  return parts.join(" ");
}

export function buildTopicSearchIndex(topic: HelpTopic): string {
  return [
    topic.title,
    topic.summary,
    ...topic.keywords,
    blocksToText(topic.content),
    ...(topic.relatedTopicIds ?? []),
    ...(topic.relatedWorkflowIds ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

export function buildSectionSearchIndex(section: HelpSection): string {
  return [section.title, section.description ?? "", ...section.keywords, ...section.topics.map((t) => t.title)]
    .join(" ")
    .toLowerCase();
}

export function buildWorkflowSearchIndex(workflow: HelpWorkflow): string {
  return [
    workflow.title,
    workflow.summary,
    ...workflow.keywords,
    ...workflow.steps.map((s) => s.label),
  ]
    .join(" ")
    .toLowerCase();
}

export function buildChecklistSearchIndex(checklist: HelpChecklist): string {
  return [
    checklist.title,
    checklist.summary,
    ...checklist.keywords,
    ...checklist.items.map((i) => i.label),
  ]
    .join(" ")
    .toLowerCase();
}

export function buildFaqSearchIndex(faq: HelpFaq): string {
  return [faq.question, faq.answer, ...faq.keywords].join(" ").toLowerCase();
}

export function buildTroubleshootingSearchIndex(item: HelpTroubleshooting): string {
  return [
    item.title,
    item.problem,
    ...item.causes,
    ...item.fixes,
    ...item.keywords,
    ...item.links.map((l) => `${l.label} ${l.href}`),
  ]
    .join(" ")
    .toLowerCase();
}

/** Mutates entities to attach searchIndex strings. */
export function applySearchIndexes(input: {
  sections: HelpSection[];
  workflows: HelpWorkflow[];
  checklists: HelpChecklist[];
  faqs: HelpFaq[];
  troubleshooting: HelpTroubleshooting[];
}): void {
  for (const section of input.sections) {
    for (const topic of section.topics) {
      topic.searchIndex = buildTopicSearchIndex(topic);
    }
    section.searchIndex = buildSectionSearchIndex(section);
  }
  for (const workflow of input.workflows) {
    workflow.searchIndex = buildWorkflowSearchIndex(workflow);
  }
  for (const checklist of input.checklists) {
    checklist.searchIndex = buildChecklistSearchIndex(checklist);
  }
  for (const faq of input.faqs) {
    faq.searchIndex = buildFaqSearchIndex(faq);
  }
  for (const item of input.troubleshooting) {
    item.searchIndex = buildTroubleshootingSearchIndex(item);
  }
}

export function collectTopics(sections: HelpSection[]): Map<string, HelpTopic> {
  const map = new Map<string, HelpTopic>();
  for (const section of sections) {
    for (const topic of section.topics) {
      map.set(topic.id, topic);
    }
  }
  return map;
}

export function buildTopicSectionMap(sections: HelpSection[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const section of sections) {
    for (const topic of section.topics) {
      map.set(topic.id, section.id);
    }
  }
  return map;
}

export function indexRegistryMaps(
  sections: HelpSection[],
  workflows: HelpWorkflow[],
  checklists: HelpChecklist[]
): Pick<HelpRegistry, "topicsById" | "sectionsById" | "workflowsById" | "checklistsById" | "topicSectionId"> {
  const topicsById = collectTopics(sections);
  const sectionsById = new Map(sections.map((s) => [s.id, s]));
  const workflowsById = new Map(workflows.map((w) => [w.id, w]));
  const checklistsById = new Map(checklists.map((c) => [c.id, c]));
  const topicSectionId = buildTopicSectionMap(sections);
  return { topicsById, sectionsById, workflowsById, checklistsById, topicSectionId };
}
