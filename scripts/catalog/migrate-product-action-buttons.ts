#!/usr/bin/env tsx
/**
 * Migrate legacy Add to Cart settings to Buy Now + Product CTA model.
 *
 * Usage:
 *   npx tsx scripts/catalog/migrate-product-action-buttons.ts
 *   npx tsx scripts/catalog/migrate-product-action-buttons.ts --dry-run
 *   npx tsx scripts/catalog/migrate-product-action-buttons.ts --locale en-us
 */
import { Prisma, PrismaClient } from "@prisma/client";
import {
  migrateProductDocumentForProductActions,
  migrateSiteSettingsForProductActions,
} from "@/features/products/lib/migrate-product-action-buttons";
import { siteSettingsRepository } from "@/repositories/site-settings.repository";

const prisma = new PrismaClient();

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const localeIdx = process.argv.indexOf("--locale");
  const locale =
    localeIdx >= 0 && process.argv[localeIdx + 1]
      ? process.argv[localeIdx + 1].trim().toLowerCase()
      : null;
  return { dryRun, locale };
}

async function migrateLocales(dryRun: boolean, onlyLocale: string | null) {
  const rows = onlyLocale
    ? await prisma.siteSettings.findMany({ where: { locale: onlyLocale } })
    : await prisma.siteSettings.findMany();

  for (const row of rows) {
    const payload =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {};
    const result = migrateSiteSettingsForProductActions(payload);
    if (!result.changed) continue;
    console.log(`[site ${row.locale}]`);
    for (const note of result.notes) console.log(`  - ${note}`);
    if (!dryRun) {
      await siteSettingsRepository.set(row.locale, result.settings);
      console.log(`  saved site settings for ${row.locale}`);
    }
  }
}

async function migrateProducts(dryRun: boolean) {
  const products = await prisma.product.findMany({
    select: { id: true, canonicalSlug: true, payload: true },
  });
  let count = 0;
  for (const row of products) {
    const data =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : null;
    if (!data) continue;
    const result = migrateProductDocumentForProductActions(data);
    if (!result.changed) continue;
    count += 1;
    console.log(`[product ${row.canonicalSlug}]`);
    for (const note of result.notes) console.log(`  - ${note}`);
    if (!dryRun) {
      await prisma.product.update({
        where: { id: row.id },
        data: { payload: result.product as Prisma.InputJsonValue },
      });
    }
  }
  console.log(`${dryRun ? "Would migrate" : "Migrated"} ${count} product document(s)`);
}

async function main() {
  const { dryRun, locale } = parseArgs();
  console.log(`Product action buttons migration${dryRun ? " (dry run)" : ""}\n`);
  await migrateLocales(dryRun, locale);
  await migrateProducts(dryRun);
  console.log("\nDone. Reindex product catalog if buy_now_slug was added to listing records.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
