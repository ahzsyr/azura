import {
  getActiveProfileId,
  getDeploymentProfile,
  isAdminNavItemEnabled,
  isCapabilityEnabled,
  isModuleEnabled,
  isPresetEnabled,
} from "@/config/deployment-profile";
import type {
  HelpChecklist,
  HelpFaq,
  HelpRegistry,
  HelpSection,
  HelpTopic,
  HelpTroubleshooting,
  HelpWorkflow,
} from "@/features/help/types";

export function isHelpFeatureEnabled(flag: string): boolean {
  if (isCapabilityEnabled(flag) || isModuleEnabled(flag) || isPresetEnabled(flag)) return true;
  if (isAdminNavItemEnabled(flag)) return true;

  const profile = getDeploymentProfile();
  if (profile.core.includes(flag)) return true;

  if (flag === "seo") {
    return profile.core.includes("seo") || isAdminNavItemEnabled("seo-overview");
  }
  if (flag === "forms" || flag === "leads") {
    return profile.core.includes("leads") || isAdminNavItemEnabled("form-templates");
  }
  if (flag === "catalog" || flag === "shop") {
    return isPresetEnabled("product") || isAdminNavItemEnabled("products");
  }

  return false;
}

export function isEntityAvailable(entity: {
  navItemIds?: string[];
  featureFlags?: string[];
  appliesToProfiles?: string[];
}): boolean {
  if (entity.appliesToProfiles?.length) {
    const profileId = getActiveProfileId();
    if (!entity.appliesToProfiles.includes(profileId)) return false;
  }

  if (entity.navItemIds?.length) {
    if (!entity.navItemIds.some((id) => isAdminNavItemEnabled(id))) return false;
  }

  if (entity.featureFlags?.length) {
    if (!entity.featureFlags.every((flag) => isHelpFeatureEnabled(flag))) return false;
  }

  return true;
}

export function filterTopics(topics: HelpTopic[]): HelpTopic[] {
  return topics.filter(isEntityAvailable);
}

export function filterSections(sections: HelpSection[]): HelpSection[] {
  return sections
    .map((section) => ({
      ...section,
      topics: filterTopics(section.topics),
    }))
    .filter((section) => section.topics.length > 0);
}

export function filterWorkflows(workflows: HelpWorkflow[]): HelpWorkflow[] {
  return workflows.filter(isEntityAvailable);
}

export function filterChecklists(checklists: HelpChecklist[]): HelpChecklist[] {
  return checklists
    .filter(isEntityAvailable)
    .map((checklist) => ({
      ...checklist,
      items: checklist.items.filter((item) => {
        if (!item.navItemIds?.length) return true;
        return item.navItemIds.some((id) => isAdminNavItemEnabled(id));
      }),
    }))
    .filter((checklist) => checklist.items.length > 0);
}

export function filterTroubleshooting(items: HelpTroubleshooting[]): HelpTroubleshooting[] {
  return items.filter(isEntityAvailable);
}

export function filterFaqs(faqs: HelpFaq[], registry: HelpRegistry): HelpFaq[] {
  return faqs.filter((faq) => {
    if (!faq.relatedTopicIds?.length) return true;
    return faq.relatedTopicIds.some((id) => {
      const topic = registry.topicsById.get(id);
      return topic ? isEntityAvailable(topic) : false;
    });
  });
}

export function getAvailableRegistryView(registry: HelpRegistry): {
  sections: HelpSection[];
  workflows: HelpWorkflow[];
  checklists: HelpChecklist[];
  faqs: HelpFaq[];
  troubleshooting: HelpTroubleshooting[];
} {
  return {
    sections: filterSections(registry.sections),
    workflows: filterWorkflows(registry.workflows),
    checklists: filterChecklists(registry.checklists),
    faqs: filterFaqs(registry.faqs, registry),
    troubleshooting: filterTroubleshooting(registry.troubleshooting),
  };
}
