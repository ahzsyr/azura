#!/usr/bin/env tsx
/**
 * Seed Prisma Product table from filesystem JSON + JsonStore overlays.
 *
 * Usage:
 *   npm run catalog:seed-db
 *   npm run catalog:seed-db -- --locale en-us
 *   npm run catalog:seed-db -- --dry-run
 */
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { SCRIPT_CATALOG_LOCALES } from "./locale-constants";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadCollectionsFromFs } from "@/features/collections/collections-fs";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { getCollectionsMatchingProduct } from "@/features/products/product-collections";
import { toDbRow, toDbUpdateData } from "@/features/products/db/product-db-mapper";
import { upsertProductLocaleTranslations } from "@/features/products/db/product-translation";
import { normalizeProductPayload } from "@/features/products/lib/product-payload-normalize";
import { productSchema } from "@/features/products/lib/product-schema";
import { walkAllCatalogProductFiles } from "@/features/products/fs/product-fs-scan";
import type { Product } from "@/features/products/types";

const prisma = new PrismaClient();
const CATALOG_PRODUCTS_NAMESPACE = "catalog-products";

function parseProductStoreKey(key: string): { locale: string; slug: string } | null {
  const i = key.indexOf(":");
  if (i <= 0) return null;
  return { locale: key.slice(0, i), slug: key.slice(i + 1) };
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const localeArg = process.argv.find((a) => a.startsWith("--locale="));
  const locale = localeArg?.split("=")[1]?.toLowerCase();
  const locales = locale ? [locale] : [...SCRIPT_CATALOG_LOCALES];
  return { dryRun, locales };
}

function extractSlugFromJson(raw: string, fileSlug: string): string {
  try {
    const parsed = JSON.parse(raw) as { slug?: string };
    const fromJson = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
    if (fromJson) return fromJson;
  } catch {
    /* fall through */
  }
  return fileSlug;
}

async function collectionSlugsFor(slug: string, product: Product): Promise<string[]> {
  const collections = orderCollectionsHierarchy(
    (await loadCollectionsFromFs("en")).filter((c) => c.visible !== false),
  );
  const engine = catalogProductToCollectionProduct(slug, product);
  const matches = getCollectionsMatchingProduct(engine, collections, { includeParents: true });
  return matches.map((c) => c.slug);
}

async function main() {
  const { dryRun, locales } = parseArgs();
  console.log(`Seeding Product table${dryRun ? " (dry run)" : ""} for: ${locales.join(", ")}`);

  const byKey = new Map<string, { locale: string; slug: string; product: Product; sourceFile?: string }>();

  for (const locale of locales) {
    for await (const { absPath, slug: fileSlug, locale: fileLocale } of walkAllCatalogProductFiles()) {
      const loc = fileLocale ?? locale;
      if (!locales.includes(loc)) continue;
      try {
        const raw = await readFile(absPath, "utf-8");
        const canonicalSlug = extractSlugFromJson(raw, fileSlug);
        const parsed = JSON.parse(raw) as Product;
        const product = normalizeProductPayload(parsed, canonicalSlug);
        const key = `${loc}:${canonicalSlug}`;
        byKey.set(key, { locale: loc, slug: canonicalSlug, product, sourceFile: absPath });
      } catch (e) {
        console.warn(`  skip ${absPath}:`, e instanceof Error ? e.message : e);
      }
    }

    try {
      const overlayRows = await prisma.jsonStore.findMany({
        where: { namespace: CATALOG_PRODUCTS_NAMESPACE },
        orderBy: { key: "asc" },
      });
      for (const row of overlayRows) {
        const parsed = parseProductStoreKey(row.key);
        if (!parsed || !locales.includes(parsed.locale)) continue;
        if (locale && parsed.locale !== locale) continue;
        if (!row.data || typeof row.data !== "object") continue;
        const product = normalizeProductPayload(row.data as unknown as Product, parsed.slug);
        const key = `${parsed.locale}:${parsed.slug}`;
        byKey.set(key, {
          locale: parsed.locale,
          slug: parsed.slug,
          product,
          sourceFile: "json-store",
        });
      }
    } catch (e) {
      console.warn("  JsonStore overlay skipped:", e instanceof Error ? e.message : e);
    }
  }

  let ok = 0;
  const skipped = 0;
  let errors = 0;

  for (const entry of byKey.values()) {
    const validated = productSchema.safeParse(entry.product);
    if (!validated.success) {
      console.warn(`  invalid ${entry.locale}/${entry.slug}: ${validated.error.message}`);
      errors += 1;
      continue;
    }

    if (dryRun) {
      ok += 1;
      continue;
    }

    try {
      const product = validated.data as unknown as Product;
      const collectionSlugs = await collectionSlugsFor(entry.slug, product);
      const writeInput = {
        canonicalSlug: entry.slug,
        product,
        meta: {
          sourceType: "json",
          sourceFile: entry.sourceFile ?? null,
          collectionSlugs,
        },
      };
      const create = toDbRow(writeInput);
      const update = toDbUpdateData(writeInput);

      const row = await prisma.product.upsert({
        where: { canonicalSlug: entry.slug },
        create,
        update,
      });
      await upsertProductLocaleTranslations(row.id, entry.locale, product, entry.slug);
      ok += 1;
    } catch (e) {
      console.warn(`  failed ${entry.locale}/${entry.slug}:`, e instanceof Error ? e.message : e);
      errors += 1;
    }
  }

  const total = dryRun ? 0 : await prisma.product.count();
  console.log("\nSeed complete:");
  console.log(`  processed: ${byKey.size}`);
  console.log(`  ok: ${ok}`);
  console.log(`  skipped: ${skipped}`);
  console.log(`  errors: ${errors}`);
  if (!dryRun) {
    console.log(`  total in Product table: ${total}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
