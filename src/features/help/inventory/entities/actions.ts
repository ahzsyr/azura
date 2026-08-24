import type { HelpInventoryAction } from "@/features/help/inventory/types";

export const INVENTORY_ACTIONS: HelpInventoryAction[] = [
  {
    id: "action-save",
    kind: "action",
    version: 1,
    label: "Save",
    description: "Store changes without necessarily publishing.",
  },
  {
    id: "action-publish",
    kind: "action",
    version: 1,
    label: "Publish",
    description: "Make content available according to its published state.",
  },
  {
    id: "action-preview",
    kind: "action",
    version: 1,
    label: "Preview",
    description: "Review the public appearance before publishing.",
  },
  {
    id: "action-run-site-audit",
    kind: "action",
    version: 1,
    label: "Run Site Audit",
    description: "Starts a site SEO audit from SEO Overview.",
  },
  {
    id: "action-analyze-content",
    kind: "action",
    version: 1,
    label: "Analyze content",
    description: "Runs content audit analysis for the selected target.",
  },
  {
    id: "action-auto-fill-seo",
    kind: "action",
    version: 1,
    label: "Auto-fill",
    description: "Suggests SEO metadata values for the current page.",
  },
  {
    id: "action-add-redirect",
    kind: "action",
    version: 1,
    label: "Add redirect",
    description: "Creates a new redirect rule.",
  },
  {
    id: "action-delete",
    kind: "action",
    version: 1,
    label: "Delete",
    description: "Removes a record after confirmation.",
  },
  {
    id: "action-duplicate",
    kind: "action",
    version: 1,
    label: "Duplicate",
    description: "Creates a copy of the selected record.",
  },
];
