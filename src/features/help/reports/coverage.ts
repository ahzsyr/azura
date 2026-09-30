import type {
  HelpCoverageKindStat,
  HelpCoverageReport,
  HelpEntityKind,
  HelpInventoryBundle,
  HelpStaleReport,
} from "@/features/help/inventory/types";
import type { HelpEntityDefinition } from "@/features/help/inventory/types";

function kindStats(
  total: number,
  documented: number,
  kind: HelpEntityKind
): HelpCoverageKindStat {
  return {
    kind,
    total,
    documented,
    percent: total === 0 ? 100 : Math.round((documented / total) * 100),
  };
}

export function getHelpCoverageReport(
  inventory: HelpInventoryBundle,
  definitions: Map<string, HelpEntityDefinition>,
  stale: HelpStaleReport
): HelpCoverageReport {
  const staleIds = new Set(stale.items.map((i) => i.id));
  const missing: HelpCoverageReport["missing"] = [];

  const check = (id: string, kind: HelpEntityKind) => {
    const def = definitions.get(id);
    if (!def || staleIds.has(id)) {
      missing.push({ id, kind });
      return false;
    }
    return true;
  };

  let pagesDoc = 0;
  for (const p of inventory.pages) if (check(p.id, "page")) pagesDoc++;
  let tabsDoc = 0;
  for (const t of inventory.tabs) if (check(t.id, "tab")) tabsDoc++;
  let sectionsDoc = 0;
  for (const s of inventory.sections) if (check(s.id, "section")) sectionsDoc++;
  let componentsDoc = 0;
  for (const c of inventory.components) if (check(c.id, "component")) componentsDoc++;
  let fieldsDoc = 0;
  for (const f of inventory.fields) if (check(f.id, "field")) fieldsDoc++;
  let dialogsDoc = 0;
  for (const d of inventory.dialogs) if (check(d.id, "dialog")) dialogsDoc++;
  let tablesDoc = 0;
  for (const t of inventory.tables) if (check(t.id, "table")) tablesDoc++;
  let actionsDoc = 0;
  for (const a of inventory.actions) if (check(a.id, "action")) actionsDoc++;

  const kinds = [
    kindStats(inventory.pages.length, pagesDoc, "page"),
    kindStats(inventory.tabs.length, tabsDoc, "tab"),
    kindStats(inventory.sections.length, sectionsDoc, "section"),
    kindStats(inventory.components.length, componentsDoc, "component"),
    kindStats(inventory.fields.length, fieldsDoc, "field"),
    kindStats(inventory.dialogs.length, dialogsDoc, "dialog"),
    kindStats(inventory.tables.length, tablesDoc, "table"),
    kindStats(inventory.actions.length, actionsDoc, "action"),
  ];

  const pageStat = kinds.find((k) => k.kind === "page")!;

  return {
    kinds,
    needsReview: stale.items.map((i) => ({ id: i.id, reason: i.reason })),
    missing,
    pagePercent: pageStat.percent,
  };
}

export function formatHelpCoverageReport(report: HelpCoverageReport): string {
  const lines = ["Help Coverage"];
  for (const k of report.kinds) {
    lines.push(
      `${k.kind.padEnd(12)} ${k.documented} / ${k.total} (${k.percent}%)`
    );
  }
  if (report.needsReview.length) {
    lines.push("", "Needs Review");
    for (const item of report.needsReview) {
      lines.push(`  ${item.id}: ${item.reason}`);
    }
  }
  if (report.missing.length) {
    lines.push("", "Missing");
    for (const item of report.missing) {
      lines.push(`  [${item.kind}] ${item.id}`);
    }
  }
  return lines.join("\n");
}
