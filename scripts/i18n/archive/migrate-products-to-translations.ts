/**
 * Consolidate per-locale Product rows into canonical products with EntityTranslation rows.
 * Run against pre-migration Product table (locale + slug + productTitle columns).
 *
 * Run: npx tsx scripts/i18n/migrate-products-to-translations.ts
 * Dry run: npx tsx scripts/i18n/migrate-products-to-translations.ts --dry-run
 */
import { PrismaClient } from "@prisma/client";
import {
  detectLocaleColumn,
  tableHasColumn,
  upsertEntityTranslation,
  upsertLocalizedSlug,
} from "./migration-utils";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

type PreMigrationProductRow = {
  id: string;
  locale: string;
  slug: string;
  productTitle: string;
  sku: string | null;
  priceValue: unknown;
  priceCurrency: string | null;
  availability: string | null;
  stockStatus: string | null;
  brand: string | null;
  category: string | null;
  categories: unknown;
  tags: unknown;
  collectionSlugs: unknown;
  status: string;
  sourceType: string | null;
  sourceFile: string | null;
  payload: unknown;
  canonicalSlug?: string | null;
};

const DEFAULT_LOCALE_CODES = ["en-us", "en"];

const PAYLOAD_TRANSLATION_FIELDS: { field: string; keys: string[] }[] = [
  { field: "description", keys: ["description", "body", "long_description"] },
  { field: "shortDescription", keys: ["short_description", "shortDescription", "excerpt"] },
  { field: "seoTitle", keys: ["seoTitle", "seo_title", "metaTitle", "meta_title"] },
  { field: "seoDescription", keys: ["seoDescription", "seo_description", "metaDescription", "meta_description"] },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function groupKey(row: PreMigrationProductRow): string {
  const sku = row.sku?.trim();
  if (sku) return `sku:${sku.toLowerCase()}`;
  return `slug:${row.slug.trim().toLowerCase()}`;
}

function localeRank(locale: string): number {
  const normalized = locale.toLowerCase();
  const idx = DEFAULT_LOCALE_CODES.indexOf(normalized);
  return idx === -1 ? DEFAULT_LOCALE_CODES.length + 1 : idx;
}

function pickCanonicalRow(rows: PreMigrationProductRow[]): PreMigrationProductRow {
  return [...rows].sort((a, b) => localeRank(a.locale) - localeRank(b.locale))[0];
}

function extractPayloadTranslations(payload: unknown): Record<string, string> {
  const record = asRecord(payload);
  if (!record) return {};

  const out: Record<string, string> = {};
  for (const { field, keys } of PAYLOAD_TRANSLATION_FIELDS) {
    const value = pickString(record, keys);
    if (value) out[field] = value;
  }
  return out;
}

async function ensureCanonicalSlugColumn(): Promise<void> {
  if (await tableHasColumn(prisma, "Product", "canonicalSlug")) return;
  if (dryRun) {
    console.log("  [dry-run] Would add Product.canonicalSlug column");
    return;
  }
  await prisma.$executeRawUnsafe(
    "ALTER TABLE `Product` ADD COLUMN `canonicalSlug` VARCHAR(255) NULL"
  );
}

async function fetchPreMigrationProducts(): Promise<PreMigrationProductRow[]> {
  const hasLocale = await tableHasColumn(prisma, "Product", "locale");
  const hasSlug = await tableHasColumn(prisma, "Product", "slug");
  const hasTitle = await tableHasColumn(prisma, "Product", "productTitle");

  if (!hasLocale || !hasSlug || !hasTitle) {
    throw new Error(
      "Product table is already consolidated (missing locale/slug/productTitle). Run after restoring pre-migration schema or skip this script."
    );
  }

  const cols = [
    "id",
    "locale",
    "slug",
    "productTitle",
    "sku",
    "priceValue",
    "priceCurrency",
    "availability",
    "stockStatus",
    "brand",
    "category",
    "categories",
    "tags",
    "collectionSlugs",
    "status",
    "sourceType",
    "sourceFile",
    "payload",
  ];
  if (await tableHasColumn(prisma, "Product", "canonicalSlug")) {
    cols.push("canonicalSlug");
  }

  const quoted = cols.map((c) => `\`${c}\``).join(", ");
  const rows = await prisma.$queryRawUnsafe<PreMigrationProductRow[]>(
    `SELECT ${quoted} FROM \`Product\``
  );
  return rows;
}

async function migrateGroup(key: string, rows: PreMigrationProductRow[]) {
  const canonical = pickCanonicalRow(rows);
  const canonicalSlug = canonical.slug.trim();
  const duplicates = rows.filter((r) => r.id !== canonical.id);

  console.log(
    `  ${key}: canonical=${canonical.id} (${canonical.locale}/${canonicalSlug}), duplicates=${duplicates.length}`
  );

  if (dryRun) {
    for (const row of rows) {
      const payloadFields = extractPayloadTranslations(row.payload);
      console.log(
        `    [dry-run] ET Product/${canonical.id} title@${row.locale} = "${row.productTitle.trim()}"`
      );
      console.log(`    [dry-run] LocalizedSlug Product/${canonical.id}@${row.locale} = "${row.slug}"`);
      for (const [field, value] of Object.entries(payloadFields)) {
        console.log(`    [dry-run] ET Product/${canonical.id} ${field}@${row.locale}`);
      }
    }
    if (duplicates.length > 0) {
      console.log(`    [dry-run] Would delete ${duplicates.length} duplicate product row(s)`);
    }
    return { consolidated: 1, translations: rows.length, slugs: rows.length, deleted: duplicates.length };
  }

  await prisma.$executeRawUnsafe(
    "UPDATE `Product` SET `canonicalSlug` = ? WHERE `id` = ?",
    canonicalSlug,
    canonical.id
  );

  let translations = 0;
  let slugs = 0;

  for (const row of rows) {
    const localeCode = row.locale.trim();

    await upsertEntityTranslation(prisma, {
      entityType: "Product",
      entityId: canonical.id,
      field: "title",
      localeCode,
      value: row.productTitle.trim(),
    });
    translations++;

    await upsertLocalizedSlug(prisma, {
      entityType: "Product",
      entityId: canonical.id,
      localeCode,
      slug: row.slug.trim(),
    });
    slugs++;

    const payloadFields = extractPayloadTranslations(row.payload);
    for (const [field, value] of Object.entries(payloadFields)) {
      await upsertEntityTranslation(prisma, {
        entityType: "Product",
        entityId: canonical.id,
        field,
        localeCode,
        value,
      });
      translations++;
    }
  }

  if (duplicates.length > 0) {
    const ids = duplicates.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(", ");
    await prisma.$executeRawUnsafe(
      `DELETE FROM \`Product\` WHERE \`id\` IN (${placeholders})`,
      ...ids
    );
  }

  return {
    consolidated: 1,
    translations,
    slugs,
    deleted: duplicates.length,
  };
}

async function main() {
  console.log(dryRun ? "Product migration (dry run)...\n" : "Migrating products to translations...\n");

  await ensureCanonicalSlugColumn();
  const products = await fetchPreMigrationProducts();

  if (products.length === 0) {
    console.log("No product rows found.");
    return;
  }

  const groups = new Map<string, PreMigrationProductRow[]>();
  for (const row of products) {
    const key = groupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let totalTranslations = 0;
  let totalSlugs = 0;
  let totalDeleted = 0;

  for (const [key, rows] of groups) {
    const result = await migrateGroup(key, rows);
    totalTranslations += result.translations;
    totalSlugs += result.slugs;
    totalDeleted += result.deleted;
  }

  console.log(
    `\nDone. Groups: ${groups.size}, translations: ${totalTranslations}, localized slugs: ${totalSlugs}, deleted duplicates: ${totalDeleted}`
  );

  if (!dryRun) {
    const localeCol = await detectLocaleColumn(prisma, "EntityTranslation");
    console.log(`EntityTranslation locale column: ${localeCol}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
