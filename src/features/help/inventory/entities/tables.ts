import type { HelpInventoryTable } from "@/features/help/inventory/types";

export const INVENTORY_TABLES: HelpInventoryTable[] = [
  {
    id: "table-admin-list",
    kind: "table",
    version: 1,
    label: "Records list",
    description: "Searchable list of records with row actions.",
    columns: ["Title", "Status", "Updated"],
    actionIds: ["action-save"],
  },
  {
    id: "table-seo-issues",
    kind: "table",
    version: 1,
    label: "SEO issues",
    description: "Filterable issues table on SEO Issues.",
    columns: ["Severity", "Page", "Issue", "Impact", "Fix", "Status"],
  },
  {
    id: "table-seo-audit-history",
    kind: "table",
    version: 1,
    label: "Audit history",
    columns: ["Completed", "Score", "Issues", "Duration", "Snapshot"],
  },
  {
    id: "table-form-templates",
    kind: "table",
    version: 1,
    label: "Form templates",
    columns: ["Name", "Status", "Fields", "Submissions", "Version", "Updated", "Actions"],
    actionIds: ["action-duplicate", "action-publish", "action-delete"],
  },
  {
    id: "table-sitemap-urls",
    kind: "table",
    version: 1,
    label: "Sitemap URLs",
    columns: ["URL", "Exclude"],
  },
];
