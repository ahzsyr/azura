/**
 * Verify EntityTranslation coverage for all registry entity types.
 * Run: npx tsx scripts/i18n/verify-parity.ts
 *      npx tsx scripts/i18n/verify-parity.ts --legacy-columns
 * Exit code 1 when required fields are missing (for CI).
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { ENTITY_REGISTRY } from "../../src/features/translation/entity-registry";
import type { TranslatableEntityType } from "../../src/features/translation/types";
import {
  makeBlockEntityId,
  extractTranslationsFromBlocks,
  walkBlocks,
  type BlockParentType,
} from "../../src/features/translation/block-translation";
import {
  makeFooterColumnEntityId,
  makeFooterEntityId,
  makeFooterLinkEntityId,
  makeFormFieldEntityId,
  makeFormStepEntityId,
  makeMenuItemEntityId,
} from "../../src/features/translation/workspace-entity-ids";
import type { PageBlocks } from "../../src/types/builder";
import {
  detectLocaleColumn,
  ENTITY_TABLE_NAMES,
  fetchEntitiesRaw,
  listRegistryEntityTypes,
  quoteIdent,
  tableHasColumn,
} from "./migration-utils";

function isPostgres(): boolean {
  const url = process.env.DATABASE_URL;
  return !!url && /^postgres(ql)?:\/\//i.test(url);
}

const prisma = new PrismaClient();
const checkLegacyColumns = process.argv.includes("--legacy-columns");

type CoverageResult = {
  entityType: string;
  entities: number;
  requiredSlots: number;
  filledSlots: number;
  missingRequired: number;
  optionalSlots: number;
  filledOptional: number;
};

async function loadTranslationIndex(
  entityType: string,
  entityIds: string[]
): Promise<Map<string, Set<string>>> {
  if (entityIds.length === 0) return new Map();

  const localeCol = await detectLocaleColumn(prisma, "EntityTranslation");
  const postgres = isPostgres();
  const t = quoteIdent("EntityTranslation", postgres);
  const entityIdCol = quoteIdent("entityId", postgres);
  const fieldCol = quoteIdent("field", postgres);
  const localeColQ = quoteIdent(localeCol, postgres);
  const valueCol = quoteIdent("value", postgres);
  const entityTypeCol = quoteIdent("entityType", postgres);

  let rows: { entityId: string; field: string; localeCode: string; value: string }[];
  if (postgres) {
    const placeholders = entityIds.map((_, i) => `$${i + 2}`).join(", ");
    rows = await prisma.$queryRawUnsafe(
      `SELECT ${entityIdCol}, ${fieldCol}, ${localeColQ} AS "localeCode", ${valueCol}
       FROM ${t}
       WHERE ${entityTypeCol} = $1 AND ${entityIdCol} IN (${placeholders})`,
      entityType,
      ...entityIds
    );
  } else {
    const placeholders = entityIds.map(() => "?").join(", ");
    rows = await prisma.$queryRawUnsafe(
      `SELECT ${entityIdCol}, ${fieldCol}, ${localeColQ} AS localeCode, ${valueCol}
       FROM ${t}
       WHERE ${entityTypeCol} = ? AND ${entityIdCol} IN (${placeholders})`,
      entityType,
      ...entityIds
    );
  }

  const index = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.value?.trim()) continue;
    const key = `${row.entityId}:${row.localeCode}:${row.field}`;
    const set = index.get(row.entityId) ?? new Set<string>();
    set.add(key);
    index.set(row.entityId, set);
  }
  return index;
}

async function getEnabledLocales() {
  return prisma.localeConfig.findMany({
    where: { isEnabled: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
}

async function verifyEntityType(entityType: TranslatableEntityType): Promise<CoverageResult> {
  const config = ENTITY_REGISTRY[entityType];
  const table = ENTITY_TABLE_NAMES[entityType];
  const empty: CoverageResult = {
    entityType,
    entities: 0,
    requiredSlots: 0,
    filledSlots: 0,
    missingRequired: 0,
    optionalSlots: 0,
    filledOptional: 0,
  };

  if (!table) {
    console.log(`  Skip ${entityType} — no SQL table`);
    return empty;
  }

  const locales = await getEnabledLocales();
  if (locales.length === 0) {
    console.log(`  Skip ${entityType} — no enabled locales`);
    return empty;
  }

  const entities = await fetchEntitiesRaw(prisma, table, ["id"]);
  if (entities.length === 0) {
    console.log(`  ${entityType}: 0 entities`);
    return empty;
  }

  const entityIds = entities.map((e) => String(e.id));
  const index = await loadTranslationIndex(entityType, entityIds);

  let requiredSlots = 0;
  let filledRequired = 0;
  let optionalSlots = 0;
  let filledOptional = 0;
  let missingRequired = 0;

  for (const entityId of entityIds) {
    const entityKeys = index.get(entityId) ?? new Set<string>();

    for (const locale of locales) {
      for (const fieldDef of config.fields) {
        const slotKey = `${entityId}:${locale.code}:${fieldDef.field}`;
        const filled = entityKeys.has(slotKey);

        if (fieldDef.required) {
          requiredSlots++;
          if (filled) {
            filledRequired++;
          } else {
            missingRequired++;
            console.warn(
              `  MISSING: ${entityType}/${entityId} required field "${fieldDef.field}" @ ${locale.code}`
            );
          }
        } else {
          optionalSlots++;
          if (filled) filledOptional++;
        }
      }
    }
  }

  const requiredPct =
    requiredSlots > 0 ? Math.round((filledRequired / requiredSlots) * 100) : 100;
  const optionalPct =
    optionalSlots > 0 ? Math.round((filledOptional / optionalSlots) * 100) : 100;

  console.log(
    `  ${entityType}: ${entities.length} entities — required ${requiredPct}% (${filledRequired}/${requiredSlots}), optional ${optionalPct}% (${filledOptional}/${optionalSlots})`
  );

  return {
    entityType,
    entities: entities.length,
    requiredSlots,
    filledSlots: filledRequired,
    missingRequired,
    optionalSlots,
    filledOptional,
  };
}

type MenuItemLike = {
  id: string;
  label?: string;
  labels?: Record<string, string>;
  children?: MenuItemLike[];
};

function walkMenuItems(items: MenuItemLike[]): MenuItemLike[] {
  const out: MenuItemLike[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children?.length) out.push(...walkMenuItems(item.children));
  }
  return out;
}

async function verifyWorkspaceEntities(): Promise<number> {
  console.log("\nWorkspace JSON entities:");
  let missing = 0;
  const locales = await getEnabledLocales();
  if (locales.length === 0) return 0;

  const header = await prisma.jsonStore.findFirst({
    where: { namespace: "header-workspace", key: "default" },
  });
  if (header?.data && typeof header.data === "object") {
    const ws = header.data as {
      menusDatabase?: Record<string, { items?: MenuItemLike[] }>;
    };
    const menuRefs: { entityId: string; menuKey: string; itemId: string }[] = [];
    for (const [menuKey, menu] of Object.entries(ws.menusDatabase ?? {})) {
      for (const item of walkMenuItems(menu.items ?? [])) {
        menuRefs.push({
          menuKey,
          itemId: item.id,
          entityId: makeMenuItemEntityId(menuKey, item.id),
        });
      }
    }
    if (menuRefs.length > 0) {
      const index = await loadTranslationIndex(
        "MenuItem",
        menuRefs.map((r) => r.entityId)
      );
      for (const ref of menuRefs) {
        const hasLabel = locales.some((l) =>
          index.get(ref.entityId)?.has(`${ref.entityId}:${l.code}:label`)
        );
        if (!hasLabel) {
          missing++;
          console.warn(`  MISSING MenuItem label translation: ${ref.menuKey}/${ref.itemId}`);
        }
      }
      console.log(`  MenuItem: ${menuRefs.length} items, ${missing} missing label translations`);
    }
  }

  const footer = await prisma.jsonStore.findFirst({
    where: { namespace: "footer-workspace", key: "default" },
  });
  if (footer?.data && typeof footer.data === "object") {
    const ws = footer.data as {
      columns?: { id: string; title?: string; links?: { id: string; label?: string }[] }[];
      copyright?: { rightsText?: string };
    };
    const colIds = (ws.columns ?? []).map((c) => makeFooterColumnEntityId(c.id));
    const linkIds = (ws.columns ?? []).flatMap((c) =>
      (c.links ?? []).map((l) => makeFooterLinkEntityId(c.id, l.id))
    );
    const footerId = makeFooterEntityId();
    const allIds = [...colIds, ...linkIds, footerId];
    const index = await loadTranslationIndex("FooterColumn", colIds);
    const linkIndex = await loadTranslationIndex("FooterLink", linkIds);
    const footerIndex = await loadTranslationIndex("Footer", [footerId]);
    let footerMissing = 0;
    for (const id of colIds) {
      const has = locales.some((l) => index.get(id)?.has(`${id}:${l.code}:title`));
      if (!has) {
        footerMissing++;
        console.warn(`  MISSING FooterColumn title: ${id}`);
      }
    }
    for (const id of linkIds) {
      const has = locales.some((l) => linkIndex.get(id)?.has(`${id}:${l.code}:label`));
      if (!has) {
        footerMissing++;
        console.warn(`  MISSING FooterLink label: ${id}`);
      }
    }
    console.log(`  Footer workspace: ${footerMissing} missing translations`);
    missing += footerMissing + (footerIndex.size === 0 ? 1 : 0);
  }

  return missing;
}

async function verifyFormTemplates(): Promise<number> {
  console.log("\nForm templates:");
  let missing = 0;
  const locales = await getEnabledLocales();
  const templates = await prisma.formTemplate.findMany({ select: { id: true, definition: true } });
  for (const tpl of templates) {
    const def = tpl.definition as {
      fields?: { id: string; labelEn?: string; labelAr?: string }[];
      steps?: { id: string; titleEn?: string; titleAr?: string }[];
    };
    const fieldIds = (def.fields ?? []).map((f) => makeFormFieldEntityId(tpl.id, f.id));
    const stepIds = (def.steps ?? []).map((s) => makeFormStepEntityId(tpl.id, s.id));
    const fieldIndex = await loadTranslationIndex("FormField", fieldIds);
    for (const field of def.fields ?? []) {
      const entityId = makeFormFieldEntityId(tpl.id, field.id);
      const hasDb = locales.some((l) =>
        fieldIndex.get(entityId)?.has(`${entityId}:${l.code}:label`)
      );
      const hasLegacy = Boolean(field.labelEn?.trim() || field.labelAr?.trim());
      if (!hasDb && hasLegacy) {
        missing++;
        console.warn(`  FormField ${tpl.id}/${field.id}: legacy labelEn/Ar only (no EntityTranslation)`);
      }
    }
    for (const step of def.steps ?? []) {
      const entityId = makeFormStepEntityId(tpl.id, step.id);
      const stepIndex = await loadTranslationIndex("FormStep", [entityId]);
      const hasDb = locales.some((l) =>
        stepIndex.get(entityId)?.has(`${entityId}:${l.code}:title`)
      );
      if (!hasDb && (step.titleEn?.trim() || step.titleAr?.trim())) {
        missing++;
        console.warn(`  FormStep ${tpl.id}/${step.id}: legacy titleEn/Ar only`);
      }
    }
  }
  console.log(`  FormTemplate audit: ${missing} fields/steps with legacy-only labels`);
  return missing;
}

async function verifyBlockLegacyProps(): Promise<number> {
  console.log("\nBlock legacy props without EntityTranslation:");
  let gaps = 0;
  const locales = await getEnabledLocales();
  const publicLocales = locales.map((l) => ({
    code: l.code,
    urlPrefix: l.urlPrefix,
    label: l.label,
    htmlLang: l.htmlLang,
    dir: l.dir === "rtl" ? ("rtl" as const) : ("ltr" as const),
    flag: l.flag,
    isDefault: l.isDefault,
  }));

  async function auditBlocks(
    parentType: BlockParentType,
    parentId: string,
    blocks: unknown
  ) {
    const pageBlocks = (Array.isArray(blocks) ? blocks : []) as PageBlocks;
    if (pageBlocks.length === 0) return;
    const entityIds = walkBlocks(pageBlocks).map((b) =>
      makeBlockEntityId(parentType, parentId, b.id)
    );
    const index = await loadTranslationIndex("BuilderBlock", entityIds);
    const extracted = extractTranslationsFromBlocks(pageBlocks, parentType, parentId, publicLocales);
    for (const input of extracted) {
      const slot = `${input.entityId}:${input.localeCode}:${input.field}`;
      if (!index.get(input.entityId)?.has(slot)) {
        gaps++;
      }
    }
  }

  const pages = await prisma.cmsPage.findMany({ select: { id: true, blocks: true } });
  for (const page of pages) {
    await auditBlocks("CmsPage", page.id, page.blocks);
  }
  const posts = await prisma.post.findMany({ select: { id: true, blocks: true } });
  for (const post of posts) {
    await auditBlocks("Post", post.id, post.blocks);
  }
  const items = await prisma.contentItem.findMany({ select: { id: true, blocks: true } });
  for (const item of items) {
    await auditBlocks("ContentItem", item.id, item.blocks);
  }
  console.log(`  BuilderBlock: ${gaps} legacy prop values without matching EntityTranslation rows`);
  return gaps;
}

async function verifyLegacyColumnsRemain(): Promise<number> {
  console.log("\nLegacy En/Ar DB columns still present:");
  let count = 0;
  for (const [entityType, table] of Object.entries(ENTITY_TABLE_NAMES)) {
    if (!table) continue;
    if (await tableHasColumn(prisma, table, "titleEn")) {
      count++;
      console.warn(`  Legacy column titleEn still on ${table} (${entityType})`);
    }
  }
  if (count === 0) console.log("  No legacy titleEn columns found (schema migration complete)");
  return count;
}

function verifyRuntimeResolverFallbacks(): number {
  console.log("\nRuntime resolver fallback hardening:");
  const root = path.join(process.cwd(), "src");
  const skipDirs = new Set(["node_modules", ".next", "dist"]);
  let count = 0;

  function walk(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
      if (skipDirs.has(entry)) continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        files.push(...walk(full));
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry)) files.push(full);
    }
    return files;
  }

  for (const file of walk(root)) {
    const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
    if (rel.includes("/admin/")) continue;
    const content = readFileSync(file, "utf8");
    if (!content.includes("includeLegacySuffixFields: true")) continue;
    count++;
    console.warn(`  MISSING hardening: ${rel} still enables includeLegacySuffixFields: true`);
  }

  if (count === 0) {
    console.log("  No runtime includeLegacySuffixFields: true usage found.");
  }
  return count;
}

async function main() {
  console.log("Verifying EntityTranslation coverage...\n");

  let totalMissing = 0;
  let totalRequired = 0;
  let totalFilled = 0;

  for (const entityType of listRegistryEntityTypes()) {
    const result = await verifyEntityType(entityType);
    totalMissing += result.missingRequired;
    totalRequired += result.requiredSlots;
    totalFilled += result.filledSlots;
  }

  totalMissing += await verifyWorkspaceEntities();
  totalMissing += await verifyFormTemplates();
  const blockGaps = await verifyBlockLegacyProps();
  if (blockGaps > 0) totalMissing += 1;

  if (checkLegacyColumns) {
    const legacyCols = await verifyLegacyColumnsRemain();
    if (legacyCols > 0) process.exit(1);
  }
  totalMissing += verifyRuntimeResolverFallbacks();

  const overallPct =
    totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 100;

  console.log(
    `\nOverall required coverage: ${overallPct}% (${totalFilled}/${totalRequired}), missing: ${totalMissing}`
  );

  if (totalMissing > 0) {
    console.log("\nRun: npm run i18n:backfill && npm run i18n:backfill:workspace");
    process.exit(1);
  }
  console.log("\nCoverage OK.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
