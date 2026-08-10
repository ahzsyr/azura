import { definitionToBlocks, resetArticleBlockIds } from "@/features/help/lib/article-to-blocks";
import type { HelpEntityDefinition, HelpInventoryBundle, HelpInventoryPage } from "@/features/help/inventory/types";
import type { HelpBlock, HelpTopic } from "@/features/help/types";
import { LayoutDashboard } from "lucide-react";
import type { HelpSection } from "@/features/help/types";
import {
  FileText,
  Image,
  FormInput,
  Megaphone,
  Palette,
  Search,
  Languages,
  Settings,
  Activity,
  Database,
  Rocket,
} from "lucide-react";

const HUB_META: Record<
  string,
  { title: string; description: string; icon: typeof LayoutDashboard; keywords: string[] }
> = {
  "section-getting-started": {
    title: "Getting Started",
    description: "Dashboard and first steps for operating the site.",
    icon: Rocket,
    keywords: ["dashboard", "setup", "launch"],
  },
  "section-content": {
    title: "Content Management",
    description: "Pages, catalog, and supporting content.",
    icon: FileText,
    keywords: ["content", "pages", "products"],
  },
  "section-media": {
    title: "Media Library",
    description: "Uploads and reusable media.",
    icon: Image,
    keywords: ["media", "images"],
  },
  "section-forms": {
    title: "Forms & Leads",
    description: "Forms, submissions, and lead inboxes.",
    icon: FormInput,
    keywords: ["forms", "leads"],
  },
  "section-marketing": {
    title: "Marketing",
    description: "Campaigns, platforms, and social tools.",
    icon: Megaphone,
    keywords: ["marketing", "campaigns"],
  },
  "section-design": {
    title: "Website Design",
    description: "Theme, studio, header, footer, and widgets.",
    icon: Palette,
    keywords: ["design", "theme", "studio"],
  },
  "section-seo": {
    title: "SEO",
    description: "Metadata, audits, search engines, and search operations.",
    icon: Search,
    keywords: ["seo", "sitemap", "robots"],
  },
  "section-languages": {
    title: "Languages",
    description: "Locales and translations.",
    icon: Languages,
    keywords: ["i18n", "locale"],
  },
  "section-settings": {
    title: "Users & Settings",
    description: "Site access, accounts, email, search, and help.",
    icon: Settings,
    keywords: ["settings", "access"],
  },
  "section-performance": {
    title: "Performance",
    description: "Vitals and optimization guidance.",
    icon: Activity,
    keywords: ["performance"],
  },
  "section-advanced": {
    title: "Advanced",
    description: "System tools, modules, and advanced operations.",
    icon: Database,
    keywords: ["system", "advanced"],
  },
};

function appendChildBlocks(
  blocks: HelpBlock[],
  def: HelpEntityDefinition | undefined,
  heading: string,
  pageId: string
): void {
  if (!def) return;
  const idPrefix = `${pageId}__${def.id}`;
  blocks.push({
    id: `${idPrefix}-child-h`,
    type: "heading",
    level: 2,
    text: heading,
  });
  blocks.push(...definitionToBlocks(def, { includeTitleHeading: true, idPrefix }));
}

export function composePageTopic(
  page: HelpInventoryPage,
  inventory: HelpInventoryBundle,
  definitions: Map<string, HelpEntityDefinition>
): HelpTopic {
  resetArticleBlockIds();
  const pageDef = definitions.get(page.id);
  if (!pageDef) {
    throw new Error(`Missing page definition for ${page.id}`);
  }

  const blocks: HelpBlock[] = [];
  blocks.push(...definitionToBlocks(pageDef, { idPrefix: page.id }));

  blocks.push({
    id: `${page.id}-open-links`,
    type: "links",
    items: [{ label: `Open ${page.label}`, href: page.href }],
  });

  const fieldById = new Map(inventory.fields.map((f) => [f.id, f]));
  const componentById = new Map(inventory.components.map((c) => [c.id, c]));
  const sectionById = new Map(inventory.sections.map((s) => [s.id, s]));
  const tableById = new Map(inventory.tables.map((t) => [t.id, t]));
  const actionById = new Map(inventory.actions.map((a) => [a.id, a]));

  if (page.sectionIds?.length) {
    blocks.push({
      id: `${page.id}-overview-h`,
      type: "heading",
      level: 2,
      text: "Page overview",
    });
    for (const sectionId of page.sectionIds) {
      const section = sectionById.get(sectionId);
      const def = definitions.get(sectionId);
      if (section && def) {
        blocks.push({
          id: `${page.id}__${sectionId}-ov`,
          type: "overview_item",
          title: section.label,
          description: section.description ?? def.summary,
        });
      }
    }
  }

  const tabById = new Map(inventory.tabs.map((t) => [t.id, t]));
  const dialogById = new Map(inventory.dialogs.map((d) => [d.id, d]));

  if (page.tabIds?.length) {
    blocks.push({
      id: `${page.id}-tabs-h`,
      type: "heading",
      level: 2,
      text: "Tabs",
    });
    for (const tabId of page.tabIds) {
      const tab = tabById.get(tabId);
      appendChildBlocks(blocks, definitions.get(tabId), tab?.label ?? "Tab", page.id);
      for (const componentId of tab?.componentIds ?? []) {
        appendChildBlocks(
          blocks,
          definitions.get(componentId),
          componentById.get(componentId)?.label ?? "Component",
          page.id
        );
      }
    }
  }

  for (const componentId of page.componentIds ?? []) {
    // Skip components already documented under a page tab
    const underTab = (page.tabIds ?? []).some((tabId) =>
      tabById.get(tabId)?.componentIds?.includes(componentId)
    );
    if (underTab) continue;
    const component = componentById.get(componentId);
    appendChildBlocks(blocks, definitions.get(componentId), component?.label ?? "Component", page.id);
    for (const fieldId of component?.fieldIds ?? []) {
      appendChildBlocks(
        blocks,
        definitions.get(fieldId),
        fieldById.get(fieldId)?.label ?? "Field",
        page.id
      );
    }
  }

  for (const fieldId of page.fieldIds ?? []) {
    appendChildBlocks(
      blocks,
      definitions.get(fieldId),
      fieldById.get(fieldId)?.label ?? "Field",
      page.id
    );
  }

  for (const tableId of page.tableIds ?? []) {
    appendChildBlocks(
      blocks,
      definitions.get(tableId),
      tableById.get(tableId)?.label ?? "Table",
      page.id
    );
  }

  for (const dialogId of page.dialogIds ?? []) {
    appendChildBlocks(
      blocks,
      definitions.get(dialogId),
      dialogById.get(dialogId)?.label ?? "Dialog",
      page.id
    );
  }

  for (const actionId of page.actionIds ?? []) {
    appendChildBlocks(
      blocks,
      definitions.get(actionId),
      actionById.get(actionId)?.label ?? "Action",
      page.id
    );
  }

  return {
    id: `topic-${page.navItemId}`,
    title: page.label,
    summary: pageDef.summary,
    readingTime: pageDef.readingTime ?? 3,
    difficulty: pageDef.difficulty ?? "beginner",
    badges: pageDef.badges,
    keywords: pageDef.keywords ?? [page.navItemId],
    navItemIds: [page.navItemId],
    content: blocks,
    relatedTopicIds: pageDef.relatedTopicIds,
    relatedWorkflowIds: pageDef.relatedWorkflowIds,
  };
}

export function composeHubSections(
  inventory: HelpInventoryBundle,
  definitions: Map<string, HelpEntityDefinition>
): HelpSection[] {
  const topicsByHub = new Map<string, HelpTopic[]>();

  for (const page of inventory.pages) {
    const topic = composePageTopic(page, inventory, definitions);
    const list = topicsByHub.get(page.hubSectionId) ?? [];
    list.push(topic);
    topicsByHub.set(page.hubSectionId, list);
  }

  const sections: HelpSection[] = [];
  for (const [hubId, topics] of topicsByHub) {
    const meta = HUB_META[hubId] ?? {
      title: hubId,
      description: "Operator guides for this area.",
      icon: LayoutDashboard,
      keywords: [],
    };
    sections.push({
      id: hubId,
      title: meta.title,
      description: meta.description,
      icon: meta.icon,
      keywords: meta.keywords,
      topics: topics.sort((a, b) => a.title.localeCompare(b.title)),
    });
  }

  // Stable hub order
  const order = Object.keys(HUB_META);
  sections.sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return sections;
}
