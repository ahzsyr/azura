/**
 * Generate migration inventory for translation consolidation.
 * Run: npx tsx scripts/i18n/generate-migration-inventory.ts
 */
import * as fs from "fs";
import * as path from "path";
import { ENTITY_REGISTRY } from "../../src/features/translation/entity-registry";
import { BLOCK_TRANSLATABLE_FIELDS } from "../../src/features/translation/block-translation";
import { listRegistryEntityTypes, ENTITY_TABLE_NAMES } from "./migration-utils";

const LEGACY_COLUMN_TABLES: { table: string; columns: string[] }[] = (() => {
  try {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "scripts/i18n/archive/generate-migration-sql.ts"),
      "utf-8"
    );
    const match = sql.match(/const enArColumns[\s\S]*?^\];/m);
    if (!match) return [];
    const tables: { table: string; columns: string[] }[] = [];
    const rowRe = /\{\s*table:\s*"([^"]+)"\s*,\s*columns:\s*\[([\s\S]*?)\]\s*\}/g;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(match[0]))) {
      const cols = [...m[2].matchAll(/"([^"]+)"/g)].map((c) => c[1]);
      tables.push({ table: m[1], columns: cols });
    }
    return tables;
  } catch {
    return [];
  }
})();

function countLegacyPatternsInSrc(): Record<string, number> {
  const srcDir = path.join(process.cwd(), "src");
  const patterns: Record<string, RegExp> = {
    titleEn_titleAr: /titleEn|titleAr/g,
    labelEn_labelAr: /labelEn|labelAr/g,
    localeStartsWithAr: /locale\.startsWith\s*\(\s*["']ar/g,
    labelsMap: /labels\s*:\s*\{|\.labels\b/g,
  };
  const counts: Record<string, number> = {};
  for (const key of Object.keys(patterns)) counts[key] = 0;

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf-8");
        for (const [key, re] of Object.entries(patterns)) {
          const matches = text.match(re);
          if (matches) counts[key] += matches.length;
        }
      }
    }
  }
  walk(srcDir);
  return counts;
}

function buildInventoryMarkdown(): string {
  const registryTypes = listRegistryEntityTypes();
  const withTable = registryTypes.filter((t) => ENTITY_TABLE_NAMES[t]);
  const jsonOnly = registryTypes.filter((t) => !ENTITY_TABLE_NAMES[t]);
  const legacyCounts = countLegacyPatternsInSrc();
  const blockTypes = Object.keys(BLOCK_TRANSLATABLE_FIELDS);

  const lines: string[] = [
    "# Translation Migration Inventory",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Registry entity types",
    "",
    `- Total registered: **${registryTypes.length}**`,
    `- SQL-backed: **${withTable.length}**`,
    `- JSON/workspace-only: **${jsonOnly.length}**`,
    "",
    "### JSON/workspace-only entities",
    "",
    ...jsonOnly.map((t) => `- \`${t}\` — ${ENTITY_REGISTRY[t].fields.map((f) => f.field).join(", ")}`),
    "",
    "## Legacy DB columns (Phase 5 drop list)",
    "",
    ...LEGACY_COLUMN_TABLES.map(
      (row) => `- \`${row.table}\`: ${row.columns.length} columns (${row.columns.slice(0, 4).join(", ")}${row.columns.length > 4 ? ", …" : ""})`
    ),
    "",
    "## Block translatable field maps",
    "",
    `- Block types with field maps: **${blockTypes.length}**`,
    "",
    "## Legacy pattern counts in src/",
    "",
    ...Object.entries(legacyCounts).map(([k, v]) => `- \`${k}\`: **${v}** occurrences`),
    "",
    "## Workspace entity ID conventions",
    "",
    "- `MenuItem`: `makeMenuItemEntityId(menuKey, itemId)`",
    "- `FooterColumn`: `makeFooterColumnEntityId(columnId)`",
    "- `FooterLink`: `makeFooterLinkEntityId(columnId, linkId)`",
    "- `Footer`: `makeFooterEntityId()`",
    "- `FormField`: `makeFormFieldEntityId(templateId, fieldId)`",
    "- `FormStep`: `makeFormStepEntityId(templateId, stepId)`",
    "- `BuilderBlock`: `makeBlockEntityId(parentType, parentId, blockId)`",
    "",
  ];
  return lines.join("\n");
}

const outPath = path.join(process.cwd(), "docs/i18n-migration-inventory.md");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buildInventoryMarkdown(), "utf-8");
console.log(`Wrote ${outPath}`);
