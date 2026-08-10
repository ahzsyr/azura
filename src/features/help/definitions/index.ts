import type { HelpEntityDefinition } from "@/features/help/inventory/types";
import type {
  HelpInventoryBundle,
  HelpInventoryPage,
  HelpPageKind,
} from "@/features/help/inventory/types";
import { helpInventory } from "@/features/help/inventory";

function kindCopy(kind: HelpPageKind, label: string): Pick<
  HelpEntityDefinition,
  "purpose" | "whenToUse" | "prerequisites" | "configurationSteps" | "bestPractices" | "mistakes" | "warnings"
> {
  switch (kind) {
    case "dashboard":
      return {
        purpose: `Review status and take recommended actions for ${label}.`,
        whenToUse: [
          `You need a quick health check of ${label}`,
          "You want to jump to related configuration pages",
          "You are monitoring recent activity or scores",
        ],
        prerequisites: ["Administrator access", "Relevant content or integrations configured"],
        configurationSteps: [
          `Open ${label} from the admin sidebar`,
          "Review the summary metrics and status indicators",
          "Follow recommended actions or quick links to fix issues",
          "Return here after changes to confirm improvements",
        ],
        bestPractices: [
          "Check this dashboard after major content or settings changes",
          "Treat red/warning indicators as actionable work items",
        ],
        mistakes: ["Ignoring warning indicators until launch day"],
      };
    case "table":
      return {
        purpose: `Find, filter, and act on records related to ${label}.`,
        whenToUse: [
          "You need to locate a specific record",
          "You want to review recent activity",
          "You need to take row-level actions",
        ],
        prerequisites: ["Administrator access", "Records have been created or collected"],
        configurationSteps: [
          `Open ${label}`,
          "Use search and filters to narrow results",
          "Open a row for details or run an allowed action",
          "Confirm the change and refresh the list if needed",
        ],
        bestPractices: ["Use filters before bulk actions", "Verify the correct row before destructive actions"],
        mistakes: ["Acting on filtered results without confirming filters are correct"],
        warnings: ["Bulk or delete actions can affect many records at once."],
      };
    case "informational":
      return {
        purpose: `Understand reports and guidance shown on ${label}.`,
        whenToUse: [
          "You need to interpret audit or rule results",
          "You are deciding what to fix next",
        ],
        prerequisites: ["Administrator access", "Source data or audits have been generated"],
        configurationSteps: [
          `Open ${label}`,
          "Read the listed findings or rules",
          "Follow linked pages to apply fixes",
          "Re-check this page after changes",
        ],
        bestPractices: ["Prioritize high-severity findings first", "Document why you accept or defer an item"],
        mistakes: ["Treating informational lists as already applied configuration"],
      };
    default:
      return {
        purpose: `Configure and manage ${label} for your website.`,
        whenToUse: [
          `You need to set up or update ${label}`,
          "You are preparing for launch or a content change",
        ],
        prerequisites: ["Administrator access", "Any dependent modules already enabled for your profile"],
        configurationSteps: [
          `Open ${label} from the admin sidebar`,
          "Review the current settings or records",
          "Make the required changes",
          "Save, then preview or publish when available",
          "Verify the public site reflects the update",
        ],
        bestPractices: [
          "Save frequently while editing",
          "Preview before publishing when the action is available",
          "Use the locale switcher when editing translated fields",
        ],
        mistakes: [
          "Leaving draft changes unpublished when they should be live",
          "Editing the wrong locale by mistake",
        ],
      };
  }
}

const WORKFLOWS_BY_NAV: Record<string, string[]> = {
  dashboard: ["workflow-first-setup"],
  pages: ["workflow-create-page"],
  products: ["workflow-add-products"],
  theme: ["workflow-customize-design"],
  studio: ["workflow-customize-design"],
  "form-templates": ["workflow-configure-forms"],
  languages: ["workflow-enable-languages"],
  "seo-overview": ["workflow-seo-setup"],
  "seo-metadata": ["workflow-seo-setup"],
  "site-access": ["workflow-launch-website"],
  "email-accounts": ["workflow-configure-email"],
  "marketing-dashboard": ["workflow-configure-marketing"],
};

function pageDefinition(page: HelpInventoryPage): HelpEntityDefinition {
  const copy = kindCopy(page.pageKind, page.label);
  return {
    id: page.id,
    version: 1,
    reviewedAgainstInventoryVersion: page.version,
    title: page.label,
    summary: `${page.label} helps administrators ${copy.purpose?.replace(/^Configure and manage |^Review status and take recommended actions for |^Find, filter, and act on records related to |^Understand reports and guidance shown on /i, "").replace(/\.$/, "") ?? "operate this area of the site"}.`,
    purpose: copy.purpose,
    whenToUse: copy.whenToUse,
    prerequisites: copy.prerequisites,
    configurationSteps: copy.configurationSteps,
    bestPractices: copy.bestPractices,
    mistakes: copy.mistakes,
    warnings: copy.warnings,
    keywords: [page.label.toLowerCase(), page.navItemId, page.pageKind],
    readingTime: page.pageKind === "dashboard" ? 2 : 3,
    difficulty: page.pageKind === "informational" ? "intermediate" : "beginner",
    relatedWorkflowIds: WORKFLOWS_BY_NAV[page.navItemId],
    faq: [
      {
        id: `${page.id}-faq-1`,
        question: `Where do I open ${page.label}?`,
        answer: `Use the admin sidebar and open ${page.label}, or go directly to ${page.href}.`,
      },
    ],
    troubleshooting: [
      {
        id: `${page.id}-ts-1`,
        problem: `${page.label} is missing from the sidebar`,
        causes: [
          "Your deployment profile disables this navigation item",
          "You are not signed in as an administrator",
        ],
        fixes: [
          "Confirm you are logged into /admin",
          "Check deployment profile enabled nav items",
        ],
      },
    ],
  };
}

function entityDefinition(
  id: string,
  title: string,
  summary: string,
  inventoryVersion: number,
  extra?: Partial<HelpEntityDefinition>
): HelpEntityDefinition {
  return {
    id,
    version: 1,
    reviewedAgainstInventoryVersion: inventoryVersion,
    title,
    summary,
    ...extra,
  };
}

export function buildAllHelpDefinitions(
  inventory: HelpInventoryBundle = helpInventory
): Map<string, HelpEntityDefinition> {
  const map = new Map<string, HelpEntityDefinition>();

  for (const page of inventory.pages) {
    map.set(page.id, pageDefinition(page));
  }

  for (const field of inventory.fields) {
    map.set(
      field.id,
      entityDefinition(field.id, field.label, field.description ?? field.label, field.version, {
        purpose: field.description,
        recommended: `Complete ${field.label} with accurate, unique values.`,
        mistakes: [`Leaving ${field.label} empty on public pages`],
      })
    );
  }

  for (const component of inventory.components) {
    map.set(
      component.id,
      entityDefinition(
        component.id,
        component.label,
        component.description ?? component.label,
        component.version,
        {
          purpose: component.description,
          whenToUse: [`You need to configure ${component.label} on a content or SEO screen`],
          configurationSteps: [
            `Locate the ${component.label} block on the page`,
            "Fill required fields",
            "Save the parent page",
          ],
          bestPractices:
            component.id === "component-seo-meta"
              ? [
                  "Write unique titles and descriptions per page",
                  "Keep titles under ~60 characters when possible",
                  "Use Auto-fill as a starting point, then edit",
                ]
              : [`Keep ${component.label} consistent across related pages`],
          mistakes:
            component.id === "component-seo-meta"
              ? [
                  "Reusing the same meta title on many pages",
                  "Leaving meta description empty on key landing pages",
                ]
              : undefined,
        }
      )
    );
  }

  for (const section of inventory.sections) {
    map.set(
      section.id,
      entityDefinition(section.id, section.label, section.description ?? section.label, section.version, {
        purpose: `Group related ${section.label} settings together.`,
      })
    );
  }

  for (const table of inventory.tables) {
    map.set(
      table.id,
      entityDefinition(table.id, table.label, table.description ?? table.label, table.version, {
        purpose: "Browse and act on records in a table.",
        whenToUse: ["You need to search, filter, or open a record"],
      })
    );
  }

  for (const action of inventory.actions) {
    map.set(
      action.id,
      entityDefinition(action.id, action.label, action.description ?? action.label, action.version, {
        purpose: action.description,
      })
    );
  }

  for (const dialog of inventory.dialogs) {
    map.set(
      dialog.id,
      entityDefinition(dialog.id, dialog.label, dialog.description ?? dialog.label, dialog.version)
    );
  }

  for (const tab of inventory.tabs) {
    map.set(
      tab.id,
      entityDefinition(tab.id, tab.label, tab.description ?? tab.label, tab.version)
    );
  }

  return map;
}

export const helpDefinitions: Map<string, HelpEntityDefinition> = buildAllHelpDefinitions();
