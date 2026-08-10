import {
  deriveChecklistProgress,
  readChecklistProgress,
} from "@/features/help/lib/checklist-storage";
import { helpRegistry } from "@/features/help/data/registry";
import type {
  HelpChecklist,
  HelpChecklistProgress,
  HelpTopic,
  HelpWorkflow,
} from "@/features/help/types";

export type HelpTopicStatus = "new" | "in_progress" | "completed" | "recommended";

function checklistIdsForTopic(topic: HelpTopic): string[] {
  const ids = new Set<string>();
  for (const block of topic.content) {
    if (block.type === "checklist") ids.add(block.checklistId);
  }
  for (const workflowId of topic.relatedWorkflowIds ?? []) {
    const workflow = helpRegistry.workflowsById.get(workflowId);
    if (!workflow) continue;
    for (const step of workflow.steps) {
      if (step.type === "checklist") ids.add(step.checklistId);
    }
  }
  return [...ids];
}

export function getChecklistProgressSnapshot(checklistId: string): HelpChecklistProgress | null {
  const checklist = helpRegistry.checklistsById.get(checklistId);
  if (!checklist) return null;
  return deriveChecklistProgress(checklist, readChecklistProgress(checklistId));
}

export function getWorkflowChecklistProgress(
  workflow: HelpWorkflow
): HelpChecklistProgress | null {
  const step = workflow.steps.find((s) => s.type === "checklist");
  if (!step || step.type !== "checklist") return null;
  return getChecklistProgressSnapshot(step.checklistId);
}

export function inferTopicStatus(topic: HelpTopic): HelpTopicStatus {
  const checklistIds = checklistIdsForTopic(topic);
  const progresses = checklistIds
    .map((id) => getChecklistProgressSnapshot(id))
    .filter((p): p is HelpChecklistProgress => Boolean(p));

  if (progresses.some((p) => p.total > 0 && p.percent === 100)) return "completed";
  if (progresses.some((p) => p.percent > 0 && p.percent < 100)) return "in_progress";

  const badges = topic.badges ?? [];
  if (badges.includes("recommended") || badges.includes("launch-required")) {
    return "recommended";
  }
  return "new";
}

export function findInProgressChecklist(
  checklists: HelpChecklist[]
): { checklist: HelpChecklist; progress: HelpChecklistProgress } | null {
  for (const checklist of checklists) {
    const progress = deriveChecklistProgress(checklist, readChecklistProgress(checklist.id));
    if (progress.percent > 0 && progress.percent < 100) {
      return { checklist, progress };
    }
  }
  return null;
}

export function resolvePrimaryTopicLink(topic: HelpTopic): { label: string; href: string } | null {
  for (const block of topic.content) {
    if (block.type === "links" && block.items[0]) {
      return block.items[0];
    }
  }
  return null;
}

/** Topic navigation order: workflow topic steps if available, else section order. */
export function resolveTopicNavSequence(
  topicId: string,
  sectionTopicIds: string[]
): string[] {
  const topic = helpRegistry.topicsById.get(topicId);
  if (topic?.relatedWorkflowIds?.length) {
    for (const workflowId of topic.relatedWorkflowIds) {
      const workflow = helpRegistry.workflowsById.get(workflowId);
      if (!workflow) continue;
      const ids = workflow.steps
        .filter((s): s is Extract<typeof s, { type: "topic" }> => s.type === "topic")
        .map((s) => s.topicId);
      if (ids.includes(topicId) && ids.length > 1) return ids;
    }
  }
  return sectionTopicIds;
}
