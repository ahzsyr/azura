/**
 * Fill Arabic translations for BRT solutions content items.
 *
 * Run:
 *   DATABASE_URL=... npx tsx scripts/content/fill-solutions-arabic.ts
 *   DATABASE_URL=... npx tsx scripts/content/fill-solutions-arabic.ts --dry-run
 */
import { PrismaClient } from "@prisma/client";
import { getContentFieldSuffix } from "../../src/i18n/locale-config";
import { compositionService } from "../../src/features/layout-engine/composition.service";
import {
  BLOCK_TRANSLATABLE_FIELDS,
  makeBlockEntityId,
  walkBlocks,
} from "../../src/features/translation/block-translation";
import type { BlockNode, PageBlocks } from "../../src/types/builder";
import { upsertEntityTranslation } from "../i18n/migration-utils";
import {
  normalizeTranslationKey,
  translateSolutionsText,
} from "./translations/solutions-ar";

const TARGET_SLUGS = [
  "security-systems",
  "iot-solutions",
  "smart-home-automation",
  "ip-pbx",
  "infrastructure",
] as const;

const AR_LOCALE = "ar";
const AR_SUFFIX = getContentFieldSuffix(AR_LOCALE);
const LOCALIZED_ELEMENT_KEYS = ["text", "title", "rawHtml", "alt", "ariaLabel", "caption"] as const;

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const shouldRevalidate = process.argv.includes("--revalidate");

type Stats = {
  itemsUpdated: number;
  blockFieldsPatched: number;
  elementFieldsPatched: number;
  entityTranslationsUpserted: number;
  faqItemsUpdated: number;
  unmatchedStrings: Set<string>;
};

function readStringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readLocalizedEn(record: Record<string, unknown>, baseKey: string): string {
  const base = readStringField(record, baseKey).trim();
  if (base) return base;
  return readStringField(record, `${baseKey}En`).trim();
}

function patchLocalizedValue(
  record: Record<string, unknown>,
  baseKey: string,
  stats: Stats,
  kind: "block" | "element",
): boolean {
  const enValue = readLocalizedEn(record, baseKey);

  if (!enValue) return false;

  const arKey = `${baseKey}${AR_SUFFIX}`;
  if (readStringField(record, arKey).trim()) return false;

  const arValue = translateSolutionsText(enValue);
  if (!arValue) {
    stats.unmatchedStrings.add(normalizeTranslationKey(enValue));
    return false;
  }

  record[arKey] = arValue;
  if (kind === "block") stats.blockFieldsPatched += 1;
  else stats.elementFieldsPatched += 1;
  return true;
}

function patchHtmlElement(element: Record<string, unknown>, stats: Stats): boolean {
  let changed = false;

  for (const baseKey of LOCALIZED_ELEMENT_KEYS) {
    changed = patchLocalizedValue(element, baseKey, stats, "element") || changed;
  }

  const attrs = element.attributes;
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    for (const baseKey of ["title", "alt", "ariaLabel", "caption"] as const) {
      changed =
        patchLocalizedValue(attrs as Record<string, unknown>, baseKey, stats, "element") || changed;
    }
  }

  if (Array.isArray(element.children)) {
    for (const child of element.children) {
      if (child && typeof child === "object") {
        changed = patchHtmlElement(child as Record<string, unknown>, stats) || changed;
      }
    }
  }

  return changed;
}

function patchCustomHtmlBlock(block: BlockNode, stats: Stats): boolean {
  const props = (block.props ?? {}) as Record<string, unknown>;
  let changed = false;

  if (Array.isArray(props.elements)) {
    for (const element of props.elements) {
      if (element && typeof element === "object") {
        changed = patchHtmlElement(element as Record<string, unknown>, stats) || changed;
      }
    }
  }

  block.props = props;
  return changed;
}

function patchBlockNode(block: BlockNode, stats: Stats): boolean {
  let changed = false;

  if (block.type === "customHtml") {
    changed = patchCustomHtmlBlock(block, stats) || changed;
  }

  const translatableFields = BLOCK_TRANSLATABLE_FIELDS[block.type] ?? [];
  for (const field of translatableFields) {
    const props = (block.props ?? {}) as Record<string, unknown>;
    const settings = (block.settings ?? {}) as Record<string, unknown>;
    changed = patchLocalizedValue(props, field, stats, "block") || changed;
    changed = patchLocalizedValue(settings, field, stats, "block") || changed;
    block.props = props;
    block.settings = settings;
  }

  if (Array.isArray(block.children)) {
    for (const child of block.children) {
      if (child && typeof child === "object") {
        changed = patchBlockNode(child as BlockNode, stats) || changed;
      }
    }
  }

  return changed;
}

function patchBlocks(blocks: PageBlocks, stats: Stats): boolean {
  let changed = false;
  for (const block of walkBlocks(blocks)) {
    changed = patchBlockNode(block, stats) || changed;
  }
  return changed;
}

function saveBlocksToComposition(
  compositionRaw: unknown,
  blocksRaw: unknown,
  patchedPrimary: PageBlocks,
): { composition: unknown; blocks: PageBlocks } {
  const loaded = compositionService.load({
    composition: compositionRaw,
    blocks: blocksRaw,
  });

  const composition = {
    ...loaded,
    regions: {
      ...loaded.regions,
      primary: patchedPrimary,
    },
  };

  return {
    composition,
    blocks: patchedPrimary,
  };
}

async function patchEntityTranslationField(
  entityType: string,
  entityId: string,
  field: string,
  enValue: string,
  stats: Stats,
  options?: { force?: boolean },
): Promise<void> {
  const arValue = translateSolutionsText(enValue);
  if (!arValue) {
    stats.unmatchedStrings.add(normalizeTranslationKey(enValue));
    return;
  }

  const existing = await prisma.entityTranslation.findFirst({
    where: {
      entityType,
      entityId,
      field,
      localeCode: AR_LOCALE,
    },
  });

  const existingVal = existing?.value?.trim() ?? "";
  const shouldWrite =
    options?.force || !existingVal || existingVal === enValue.trim();

  if (!shouldWrite) return;

  if (!dryRun) {
    await upsertEntityTranslation(prisma, {
      entityType,
      entityId,
      field,
      localeCode: AR_LOCALE,
      value: arValue,
    });
  }
  stats.entityTranslationsUpserted += 1;
}

async function syncBuilderBlockTranslations(
  itemId: string,
  blocks: PageBlocks,
  stats: Stats,
): Promise<void> {
  for (const block of walkBlocks(blocks)) {
    const entityId = makeBlockEntityId("ContentItem", itemId, block.id);
    const fields = BLOCK_TRANSLATABLE_FIELDS[block.type] ?? [];
    const props = (block.props ?? {}) as Record<string, unknown>;
    const settings = (block.settings ?? {}) as Record<string, unknown>;

    for (const field of fields) {
      const enValue =
        readStringField(settings, `${field}En`) ||
        readStringField(settings, field) ||
        readStringField(props, `${field}En`) ||
        readStringField(props, field);
      if (!enValue.trim()) continue;
      await patchEntityTranslationField(
        "BuilderBlock",
        entityId,
        field,
        enValue,
        stats,
        { force: true },
      );
    }
  }
}

async function patchContentItemTranslations(itemId: string, stats: Stats): Promise<void> {
  const translations = await prisma.entityTranslation.findMany({
    where: { entityType: "ContentItem", entityId: itemId },
  });

  const enByField = new Map<string, string>();
  for (const row of translations) {
    if (row.localeCode === "en" && row.value.trim()) {
      enByField.set(row.field, row.value);
    }
  }

  for (const [field, enValue] of enByField) {
    await patchEntityTranslationField("ContentItem", itemId, field, enValue, stats, {
      force: field === "description" || field === "subtitle",
    });
  }
}

async function patchFaqBlocks(blocks: PageBlocks, stats: Stats): Promise<void> {
  for (const block of walkBlocks(blocks)) {
    if (block.type !== "faq") continue;

    const props = (block.props ?? {}) as Record<string, unknown>;
    const faqSetSlug = (
      (typeof props.faqSetSlug === "string" ? props.faqSetSlug : "") ||
      (typeof props.category === "string" ? props.category : "")
    ).trim();

    if (faqSetSlug) {
      const faqSet = await prisma.faqSet.findUnique({ where: { slug: faqSetSlug } });
      if (faqSet) {
        const setTranslations = await prisma.entityTranslation.findMany({
          where: { entityType: "FaqSet", entityId: faqSet.id, localeCode: "en" },
        });
        for (const row of setTranslations) {
          await patchEntityTranslationField("FaqSet", faqSet.id, row.field, row.value, stats);
        }

        const faqItems = await prisma.faqItem.findMany({ where: { faqSetId: faqSet.id } });
        for (const faqItem of faqItems) {
          const itemTranslations = await prisma.entityTranslation.findMany({
            where: { entityType: "FaqItem", entityId: faqItem.id, localeCode: "en" },
          });

          let itemChanged = false;
          for (const row of itemTranslations) {
            const before = stats.entityTranslationsUpserted;
            await patchEntityTranslationField("FaqItem", faqItem.id, row.field, row.value, stats, {
              force: true,
            });
            if (stats.entityTranslationsUpserted > before) itemChanged = true;
          }
          if (itemChanged) stats.faqItemsUpdated += 1;
        }
      }
    }

    const translatableFields = BLOCK_TRANSLATABLE_FIELDS.faq ?? [];
    for (const field of translatableFields) {
      patchLocalizedValue(props, field, stats, "block");
    }
    block.props = props;
  }
}

async function requestLiveRevalidation(slugs: string[]): Promise<void> {
  const baseUrl = process.env.REVALIDATE_BASE_URL?.trim();
  if (!baseUrl) {
    console.log(
      "\n[revalidate] Skipped — set REVALIDATE_BASE_URL (e.g. https://yoursite.com) and CONTENT_REVALIDATE_SECRET, then re-run with --revalidate",
    );
    console.log(
      "[revalidate] Or open each solution in admin and click Publish to refresh /ar/solutions/* (after deploying cache fix).",
    );
    return;
  }

  const secret = process.env.CONTENT_REVALIDATE_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[revalidate] CONTENT_REVALIDATE_SECRET / CRON_SECRET not set — skipping live cache bust.");
    return;
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/api/admin/content/revalidate`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      typeSlug: "solutions",
      routePrefix: "solutions",
      slugs,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.warn(`[revalidate] Failed (${response.status}): ${text.slice(0, 200)}`);
    return;
  }

  const payload = (await response.json()) as { paths?: string[] };
  console.log(`[revalidate] Busted cache for ${payload.paths?.length ?? 0} public path(s).`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required. Add it to .env or pass inline.");
    process.exit(1);
  }

  const stats: Stats = {
    itemsUpdated: 0,
    blockFieldsPatched: 0,
    elementFieldsPatched: 0,
    entityTranslationsUpserted: 0,
    faqItemsUpdated: 0,
    unmatchedStrings: new Set(),
  };

  const solutionsType = await prisma.contentType.findFirst({
    where: { slug: "solutions" },
  });

  if (!solutionsType) {
    console.error('Content type "solutions" not found.');
    process.exit(1);
  }

  const items = await prisma.contentItem.findMany({
    where: {
      contentTypeId: solutionsType.id,
      slug: { in: [...TARGET_SLUGS] },
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      blocks: true,
      composition: true,
    },
  });

  console.log(`${dryRun ? "[DRY RUN] " : ""}Found ${items.length} solution items.`);

  const updatedSlugs: string[] = [];

  for (const item of items) {
    const loaded = compositionService.load({
      composition: item.composition,
      blocks: item.blocks,
    });

    const primaryBlocks = structuredClone(loaded.regions.primary) as PageBlocks;
    const blocksChanged = patchBlocks(primaryBlocks, stats);

    const beforeEt = stats.entityTranslationsUpserted;
    const beforeFaq = stats.faqItemsUpdated;

    await patchFaqBlocks(primaryBlocks, stats);
    await patchContentItemTranslations(item.id, stats);
    await syncBuilderBlockTranslations(item.id, primaryBlocks, stats);

    const entityChanged =
      stats.entityTranslationsUpserted > beforeEt || stats.faqItemsUpdated > beforeFaq;

    if (blocksChanged || entityChanged) {
      if (blocksChanged) {
        const saved = saveBlocksToComposition(item.composition, item.blocks, primaryBlocks);
        if (!dryRun) {
          await prisma.contentItem.update({
            where: { id: item.id },
            data: {
              blocks: saved.blocks as object,
              composition: saved.composition as object,
              updatedAt: new Date(),
            },
          });
        }
      } else if (!dryRun) {
        await prisma.contentItem.update({
          where: { id: item.id },
          data: { updatedAt: new Date() },
        });
      }
      if (item.slug) updatedSlugs.push(item.slug);
      stats.itemsUpdated += 1;
      console.log(`  ✓ ${item.slug}: ${blocksChanged ? "blocks + translations" : "translations"}`);
    } else {
      console.log(`  · ${item.slug}: already complete`);
    }
  }

  console.log("\nSummary:");
  console.log(`  Items updated: ${stats.itemsUpdated}`);
  console.log(`  Block fields patched: ${stats.blockFieldsPatched}`);
  console.log(`  Custom HTML element fields patched: ${stats.elementFieldsPatched}`);
  console.log(`  Entity translations upserted: ${stats.entityTranslationsUpserted}`);
  console.log(`  FAQ items touched: ${stats.faqItemsUpdated}`);

  if (stats.unmatchedStrings.size > 0) {
    console.log(`\nUnmatched English strings (${stats.unmatchedStrings.size}):`);
    for (const s of [...stats.unmatchedStrings].sort().slice(0, 30)) {
      console.log(`  - ${s.slice(0, 120)}${s.length > 120 ? "…" : ""}`);
    }
    if (stats.unmatchedStrings.size > 30) {
      console.log(`  … and ${stats.unmatchedStrings.size - 30} more`);
    }
  }

  if (shouldRevalidate && !dryRun) {
    const slugsToRevalidate = updatedSlugs.length > 0 ? updatedSlugs : [...TARGET_SLUGS];
    await requestLiveRevalidation(slugsToRevalidate);
  } else if (!dryRun && updatedSlugs.length > 0) {
    console.log(
      "\n[revalidate] Live pages cache Arabic for up to 5 minutes. Run with --revalidate after setting REVALIDATE_BASE_URL, or redeploy with the cache-fix build.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
