import { ADMIN_DASHBOARD, ADMIN_NAV_GROUPS, type AdminNavItem } from "@/config/admin-nav";
import { DEPLOYMENT_PROFILE_IDS } from "@/config/deployment-profile/types";
import type { HelpRegistry } from "@/features/help/types";

function flattenNavItems(): AdminNavItem[] {
  const items: AdminNavItem[] = [ADMIN_DASHBOARD];
  for (const group of ADMIN_NAV_GROUPS) {
    if (group.sections?.length) {
      for (const section of group.sections) {
        items.push(...section.items);
      }
    } else {
      items.push(...group.items);
    }
  }
  return items;
}

function collectKnownNavItemIds(): Set<string> {
  const ids = new Set<string>();
  for (const item of flattenNavItems()) {
    if (item.navItemId) ids.add(item.navItemId);
  }
  return ids;
}

/**
 * Fail-fast authoring checks in development.
 * Throws if the registry has broken references or duplicate ids.
 */
export function validateHelpRegistry(registry: HelpRegistry): void {
  if (process.env.NODE_ENV === "production") return;

  const errors: string[] = [];
  const allIds = new Set<string>();
  const knownNavIds = collectKnownNavItemIds();
  const profileIds = new Set<string>(DEPLOYMENT_PROFILE_IDS);

  function claimId(id: string, kind: string) {
    if (allIds.has(id)) {
      errors.push(`Duplicate id "${id}" (${kind})`);
    }
    allIds.add(id);
  }

  for (const section of registry.sections) {
    claimId(section.id, "section");
    for (const topic of section.topics) {
      claimId(topic.id, "topic");
      for (const block of topic.content) {
        claimId(block.id, "block");
        if (block.type === "checklist" && !registry.checklistsById.has(block.checklistId)) {
          errors.push(`Topic ${topic.id} references missing checklist "${block.checklistId}"`);
        }
        if (block.type === "faq") {
          for (const item of block.items) {
            claimId(item.id, "block-faq-item");
          }
        }
      }
      for (const relatedId of topic.relatedTopicIds ?? []) {
        if (!registry.topicsById.has(relatedId)) {
          errors.push(`Topic ${topic.id} relatedTopicIds missing "${relatedId}"`);
        }
      }
      for (const workflowId of topic.relatedWorkflowIds ?? []) {
        if (!registry.workflowsById.has(workflowId)) {
          errors.push(`Topic ${topic.id} relatedWorkflowIds missing "${workflowId}"`);
        }
      }
      for (const navId of topic.navItemIds ?? []) {
        if (!knownNavIds.has(navId)) {
          errors.push(`Topic ${topic.id} invalid navItemId "${navId}"`);
        }
      }
      for (const profileId of topic.appliesToProfiles ?? []) {
        if (!profileIds.has(profileId)) {
          errors.push(`Topic ${topic.id} invalid appliesToProfiles "${profileId}"`);
        }
      }
    }
  }

  for (const workflow of registry.workflows) {
    claimId(workflow.id, "workflow");
    for (const step of workflow.steps) {
      claimId(step.id, "workflow-step");
      if (step.type === "topic" && !registry.topicsById.has(step.topicId)) {
        errors.push(`Workflow ${workflow.id} step topic missing "${step.topicId}"`);
      }
      if (step.type === "checklist" && !registry.checklistsById.has(step.checklistId)) {
        errors.push(`Workflow ${workflow.id} step checklist missing "${step.checklistId}"`);
      }
    }
    for (const navId of workflow.navItemIds ?? []) {
      if (!knownNavIds.has(navId)) {
        errors.push(`Workflow ${workflow.id} invalid navItemId "${navId}"`);
      }
    }
  }

  for (const checklist of registry.checklists) {
    claimId(checklist.id, "checklist");
    for (const item of checklist.items) {
      claimId(item.id, "checklist-item");
      for (const navId of item.navItemIds ?? []) {
        if (!knownNavIds.has(navId)) {
          errors.push(`Checklist item ${item.id} invalid navItemId "${navId}"`);
        }
      }
    }
  }

  for (const faq of registry.faqs) {
    claimId(faq.id, "faq");
    for (const relatedId of faq.relatedTopicIds ?? []) {
      if (!registry.topicsById.has(relatedId)) {
        errors.push(`FAQ ${faq.id} relatedTopicIds missing "${relatedId}"`);
      }
    }
  }

  for (const item of registry.troubleshooting) {
    claimId(item.id, "troubleshooting");
    for (const navId of item.navItemIds ?? []) {
      if (!knownNavIds.has(navId)) {
        errors.push(`Troubleshooting ${item.id} invalid navItemId "${navId}"`);
      }
    }
  }

  if (errors.length) {
    const message = `[help] Registry validation failed:\n- ${errors.join("\n- ")}`;
    console.error(message);
    throw new Error(message);
  }
}
