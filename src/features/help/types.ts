import type { LucideIcon } from "lucide-react";
import type { DeploymentProfileId } from "@/config/deployment-profile/types";

export type HelpDifficulty = "beginner" | "intermediate" | "advanced";

export type HelpBadge = "recommended" | "required" | "advanced" | "launch-required";

export type HelpBlockType =
  | "paragraph"
  | "steps"
  | "checklist"
  | "diagram"
  | "warning"
  | "links"
  | "tip"
  | "faq"
  | "heading"
  | "purpose"
  | "when_to_use"
  | "prerequisites"
  | "best_practices"
  | "mistakes"
  | "field"
  | "overview_item"
  | "troubleshooting_list";

export interface HelpBlockBase {
  id: string;
  type: HelpBlockType;
}

export type HelpBlock =
  | (HelpBlockBase & { type: "paragraph"; text: string })
  | (HelpBlockBase & { type: "steps"; items: string[] })
  | (HelpBlockBase & { type: "checklist"; checklistId: string })
  | (HelpBlockBase & { type: "diagram"; steps: string[] })
  | (HelpBlockBase & { type: "warning"; text: string })
  | (HelpBlockBase & { type: "links"; items: { label: string; href: string }[] })
  | (HelpBlockBase & { type: "tip"; text: string })
  | (HelpBlockBase & {
      type: "faq";
      items: { id: string; question: string; answer: string }[];
    })
  | (HelpBlockBase & { type: "heading"; level: 2 | 3; text: string })
  | (HelpBlockBase & { type: "purpose"; text: string })
  | (HelpBlockBase & { type: "when_to_use"; items: string[] })
  | (HelpBlockBase & { type: "prerequisites"; items: string[] })
  | (HelpBlockBase & { type: "best_practices"; items: string[] })
  | (HelpBlockBase & { type: "mistakes"; items: string[] })
  | (HelpBlockBase & {
      type: "field";
      name: string;
      purpose: string;
      recommended?: string;
      example?: string;
      mistakes?: string[];
    })
  | (HelpBlockBase & { type: "overview_item"; title: string; description: string })
  | (HelpBlockBase & {
      type: "troubleshooting_list";
      items: { id: string; problem: string; causes: string[]; fixes: string[] }[];
    });

export interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  readingTime: number;
  difficulty: HelpDifficulty;
  badges?: HelpBadge[];
  keywords: string[];
  navItemIds?: string[];
  featureFlags?: string[];
  appliesToProfiles?: DeploymentProfileId[];
  content: HelpBlock[];
  relatedTopicIds?: string[];
  relatedWorkflowIds?: string[];
  searchIndex?: string;
}

export interface HelpSection {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  keywords: string[];
  topics: HelpTopic[];
  searchIndex?: string;
}

export type HelpWorkflowStep =
  | { id: string; type: "topic"; label: string; topicId: string }
  | { id: string; type: "route"; label: string; href: string }
  | { id: string; type: "checklist"; label: string; checklistId: string };

export interface HelpWorkflow {
  id: string;
  title: string;
  summary: string;
  readingTime: number;
  difficulty: HelpDifficulty;
  badges?: HelpBadge[];
  navItemIds?: string[];
  featureFlags?: string[];
  appliesToProfiles?: DeploymentProfileId[];
  steps: HelpWorkflowStep[];
  keywords: string[];
  searchIndex?: string;
}

export interface HelpChecklistItem {
  id: string;
  label: string;
  href?: string;
  navItemIds?: string[];
}

export interface HelpChecklist {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  navItemIds?: string[];
  featureFlags?: string[];
  appliesToProfiles?: DeploymentProfileId[];
  items: HelpChecklistItem[];
  searchIndex?: string;
}

export interface HelpFaq {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  relatedTopicIds?: string[];
  searchIndex?: string;
}

export interface HelpTroubleshooting {
  id: string;
  title: string;
  problem: string;
  causes: string[];
  fixes: string[];
  links: { label: string; href: string }[];
  keywords: string[];
  navItemIds?: string[];
  searchIndex?: string;
}

export type HelpSearchHitKind =
  | "section"
  | "topic"
  | "workflow"
  | "checklist"
  | "faq"
  | "troubleshooting";

export interface HelpSearchHit {
  kind: HelpSearchHitKind;
  id: string;
  title: string;
  summary?: string;
  sectionId?: string;
}

export interface HelpSearchEngine {
  search(query: string): HelpSearchHit[];
}

export interface HelpChecklistProgressStored {
  version: number;
  checkedIds: string[];
}

export interface HelpChecklistProgress {
  completed: number;
  total: number;
  percent: number;
  checkedIds: string[];
}

export interface HelpRegistry {
  version: number;
  sections: HelpSection[];
  workflows: HelpWorkflow[];
  checklists: HelpChecklist[];
  faqs: HelpFaq[];
  troubleshooting: HelpTroubleshooting[];
  topicsById: Map<string, HelpTopic>;
  sectionsById: Map<string, HelpSection>;
  workflowsById: Map<string, HelpWorkflow>;
  checklistsById: Map<string, HelpChecklist>;
  topicSectionId: Map<string, string>;
}

export type HelpAnalyticsEvent =
  | { name: "help_opened" }
  | { name: "help_search"; queryLength: number }
  | { name: "help_topic_viewed"; topicId: string }
  | { name: "workflow_started"; workflowId: string }
  | { name: "help_deep_link"; href: string }
  | { name: "checklist_completed"; checklistId: string };

export interface HelpSystemDiagnostics {
  applicationVersion: string;
  helpContentVersion: number;
  deploymentProfileId: string;
  deploymentProfileLabel: string;
  environment: string;
  enabledModules: string[];
  enabledCapabilities: string[];
  enabledLanguages: string[];
  defaultLanguage: string | null;
  currentTheme: string | null;
  currentTimezone: string | null;
  searchEngine: string;
  buildDate: string | null;
}
