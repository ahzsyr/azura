import type { HelpBadge, HelpDifficulty } from "@/features/help/types";

/** Page classification drives which template sections are emphasized. */
export type HelpPageKind =
  | "action"
  | "dashboard"
  | "table"
  | "informational"
  | "wizard"
  | "dialog";

export type HelpEntityKind =
  | "page"
  | "tab"
  | "section"
  | "component"
  | "field"
  | "dialog"
  | "table"
  | "action";

export interface HelpInventoryEntityBase {
  id: string;
  /** Bump when UI shape changes (fields added/removed, tabs renamed). */
  version: number;
  label: string;
  description?: string;
}

export interface HelpInventoryField extends HelpInventoryEntityBase {
  kind: "field";
}

export interface HelpInventoryAction extends HelpInventoryEntityBase {
  kind: "action";
}

export interface HelpInventoryDialog extends HelpInventoryEntityBase {
  kind: "dialog";
  fieldIds?: string[];
  actionIds?: string[];
}

export interface HelpInventoryTable extends HelpInventoryEntityBase {
  kind: "table";
  columns?: string[];
  filterIds?: string[];
  actionIds?: string[];
  bulkActionIds?: string[];
}

export interface HelpInventoryComponent extends HelpInventoryEntityBase {
  kind: "component";
  fieldIds?: string[];
  actionIds?: string[];
  sectionIds?: string[];
}

export interface HelpInventorySection extends HelpInventoryEntityBase {
  kind: "section";
  fieldIds?: string[];
  componentIds?: string[];
  actionIds?: string[];
  tableIds?: string[];
}

export interface HelpInventoryTab extends HelpInventoryEntityBase {
  kind: "tab";
  sectionIds?: string[];
  componentIds?: string[];
}

/** Page composition — references entities by id only. */
export interface HelpInventoryPage extends HelpInventoryEntityBase {
  kind: "page";
  navItemId: string;
  href: string;
  pageKind: HelpPageKind;
  /** Ops Hub category grouping */
  hubSectionId: string;
  tabIds?: string[];
  sectionIds?: string[];
  componentIds?: string[];
  tableIds?: string[];
  dialogIds?: string[];
  actionIds?: string[];
  fieldIds?: string[];
}

export type HelpInventoryEntity =
  | HelpInventoryPage
  | HelpInventoryTab
  | HelpInventorySection
  | HelpInventoryComponent
  | HelpInventoryField
  | HelpInventoryDialog
  | HelpInventoryTable
  | HelpInventoryAction;

export interface HelpInventoryBundle {
  pages: HelpInventoryPage[];
  tabs: HelpInventoryTab[];
  sections: HelpInventorySection[];
  components: HelpInventoryComponent[];
  fields: HelpInventoryField[];
  dialogs: HelpInventoryDialog[];
  tables: HelpInventoryTable[];
  actions: HelpInventoryAction[];
}

/** Shared operator copy shape for any entity definition. */
export interface HelpEntityDefinitionBase {
  id: string;
  version: number;
  /** Must match inventory entity.version when reviewed. */
  reviewedAgainstInventoryVersion: number;
  title: string;
  summary: string;
  purpose?: string;
  whenToUse?: string[];
  prerequisites?: string[];
  bestPractices?: string[];
  mistakes?: string[];
  warnings?: string[];
  configurationSteps?: string[];
  faq?: { id: string; question: string; answer: string }[];
  troubleshooting?: {
    id: string;
    problem: string;
    causes: string[];
    fixes: string[];
  }[];
  relatedTopicIds?: string[];
  relatedWorkflowIds?: string[];
  keywords?: string[];
  readingTime?: number;
  difficulty?: HelpDifficulty;
  badges?: HelpBadge[];
  /** Field-specific */
  recommended?: string;
  example?: string;
}

export type HelpEntityDefinition = HelpEntityDefinitionBase;

export interface HelpCoverageKindStat {
  kind: HelpEntityKind;
  documented: number;
  total: number;
  percent: number;
}

export interface HelpCoverageReport {
  kinds: HelpCoverageKindStat[];
  needsReview: { id: string; reason: string }[];
  missing: { id: string; kind: HelpEntityKind }[];
  pagePercent: number;
}

export interface HelpStaleReport {
  items: { id: string; kind: HelpEntityKind; reason: string }[];
}
