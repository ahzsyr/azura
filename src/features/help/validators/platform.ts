import { ADMIN_DASHBOARD, ADMIN_NAV_GROUPS } from "@/config/admin-nav";
import type { HelpInventoryBundle } from "@/features/help/inventory/types";
import type { HelpEntityDefinition } from "@/features/help/inventory/types";
import { buildHelpReports } from "@/features/help/reports";
import type { HelpRegistry } from "@/features/help/types";

function allNavItemIds(): string[] {
  const ids = new Set<string>();
  if (ADMIN_DASHBOARD.navItemId) ids.add(ADMIN_DASHBOARD.navItemId);
  for (const group of ADMIN_NAV_GROUPS) {
    const list = group.sections?.length
      ? group.sections.flatMap((s) => s.items)
      : group.items;
    for (const item of list) {
      if (item.navItemId) ids.add(item.navItemId);
    }
  }
  return [...ids];
}

/**
 * Platform validators for inventory ↔ definitions ↔ nav ↔ contextual topics.
 * Fail-fast in development.
 */
export function validateHelpPlatform(input: {
  inventory: HelpInventoryBundle;
  definitions: Map<string, HelpEntityDefinition>;
  registry: HelpRegistry;
}): void {
  if (process.env.NODE_ENV === "production") return;

  const errors: string[] = [];
  const { inventory, definitions, registry } = input;
  const navIds = new Set(allNavItemIds());
  const pageByNav = new Map(inventory.pages.map((p) => [p.navItemId, p]));

  for (const navId of navIds) {
    if (!pageByNav.has(navId)) {
      errors.push(`Nav item "${navId}" has no page inventory`);
    }
  }

  for (const page of inventory.pages) {
    if (!navIds.has(page.navItemId)) {
      errors.push(`Page inventory "${page.id}" has invalid navItemId "${page.navItemId}"`);
    }
    if (!definitions.has(page.id)) {
      errors.push(`Page "${page.id}" has no help definition`);
    }
    const topicId = `topic-${page.navItemId}`;
    const topic = registry.topicsById.get(topicId);
    if (!topic) {
      errors.push(`Page "${page.id}" has no composed topic "${topicId}"`);
    } else if (!topic.navItemIds?.includes(page.navItemId)) {
      errors.push(`Topic "${topicId}" missing navItemId "${page.navItemId}"`);
    }
  }

  const entityIds = new Set<string>();
  const claim = (id: string, kind: string) => {
    if (entityIds.has(id)) errors.push(`Duplicate inventory id "${id}" (${kind})`);
    entityIds.add(id);
  };

  for (const p of inventory.pages) claim(p.id, "page");
  for (const t of inventory.tabs) claim(t.id, "tab");
  for (const s of inventory.sections) claim(s.id, "section");
  for (const c of inventory.components) claim(c.id, "component");
  for (const f of inventory.fields) claim(f.id, "field");
  for (const d of inventory.dialogs) claim(d.id, "dialog");
  for (const t of inventory.tables) claim(t.id, "table");
  for (const a of inventory.actions) claim(a.id, "action");

  const resolveRef = (id: string, from: string) => {
    if (!entityIds.has(id)) errors.push(`"${from}" references unknown entity "${id}"`);
  };

  for (const page of inventory.pages) {
    for (const id of [
      ...(page.componentIds ?? []),
      ...(page.sectionIds ?? []),
      ...(page.fieldIds ?? []),
      ...(page.tableIds ?? []),
      ...(page.actionIds ?? []),
      ...(page.tabIds ?? []),
      ...(page.dialogIds ?? []),
    ]) {
      resolveRef(id, page.id);
    }
  }

  // Shared component must have exactly one definition (always true with Map — ensure present)
  const componentUsage = new Map<string, number>();
  for (const page of inventory.pages) {
    for (const id of page.componentIds ?? []) {
      componentUsage.set(id, (componentUsage.get(id) ?? 0) + 1);
    }
  }
  for (const [componentId, count] of componentUsage) {
    if (count >= 2 && !definitions.has(componentId)) {
      errors.push(
        `Shared component "${componentId}" appears on ${count} pages but has no single help definition`
      );
    }
  }

  for (const [id] of definitions) {
    if (!entityIds.has(id)) {
      errors.push(`Help definition "${id}" has no inventory entity`);
    }
  }

  const reports = buildHelpReports(inventory, definitions);
  if (reports.coverage.pagePercent < 100) {
    errors.push(`Page help coverage is ${reports.coverage.pagePercent}% (must be 100%)`);
  }
  if (reports.stale.items.length) {
    for (const item of reports.stale.items) {
      errors.push(`Needs Review [${item.kind}] ${item.id}: ${item.reason}`);
    }
  }
  for (const miss of reports.coverage.missing) {
    if (miss.kind === "page") continue; // already covered
    errors.push(`Missing help definition for [${miss.kind}] ${miss.id}`);
  }

  // Contextual help must resolve 1:1 for every nav page
  for (const page of inventory.pages) {
    const topicId = `topic-${page.navItemId}`;
    let resolved: string | null = null;
    for (const section of registry.sections) {
      for (const topic of section.topics) {
        if (topic.navItemIds?.includes(page.navItemId)) {
          resolved = topic.id;
          break;
        }
      }
      if (resolved) break;
    }
    if (resolved !== topicId) {
      errors.push(
        `Contextual resolve for nav "${page.navItemId}" expected "${topicId}" got "${resolved ?? "null"}"`
      );
    }
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.info(`[help:coverage]\n${reports.text}`);
  }

  if (errors.length) {
    const message = `[help:platform] Validation failed:\n- ${errors.join("\n- ")}`;
    console.error(message);
    throw new Error(message);
  }
}
