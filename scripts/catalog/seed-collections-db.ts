#!/usr/bin/env tsx
/**
 * Seed CatalogCollection tables from bundled collections JSON + locale overrides.
 *
 * Usage:
 *   npm run catalog:seed-collections
 *   npm run catalog:seed-collections -- --dry-run
 */
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { SCRIPT_CATALOG_LOCALES } from "./locale-constants";
import type { Collection } from "@/features/collections/types";
import { collectionToRow } from "@/features/collections/db/catalog-collection-db-mapper";
import { seedEntityTranslations } from "../i18n/seed-translations-helper";

const prisma = new PrismaClient();

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadBundledCollections(): Promise<Collection[]> {
  const root = join(process.cwd(), "seeds", "catalog");
  const flat = await readJson<Collection[]>(join(root, "collections.json"));
  if (Array.isArray(flat) && flat.length > 0) return flat;

  const hierarchy = await readJson<{ collections?: Collection[] }>(
    join(root, "collections", "brt-networking-hierarchy.json"),
  );
  return Array.isArray(hierarchy?.collections) ? hierarchy.collections : [];
}

async function loadLocaleOverrides(
  locale: string,
): Promise<Array<{ slug: string; overrides: Partial<Collection> }>> {
  const dir = join(process.cwd(), "src", "data", locale, "collections");
  if (!(await fileExists(dir))) return [];

  const entries = await readdir(dir);
  const out: Array<{ slug: string; overrides: Partial<Collection> }> = [];

  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const slug = name.replace(/\.json$/, "");
    const doc = await readJson<Partial<Collection>>(join(dir, name));
    if (doc) out.push({ slug, overrides: doc });
  }

  return out;
}

function parseArgs() {
  return { dryRun: process.argv.includes("--dry-run") };
}

async function main() {
  const { dryRun } = parseArgs();
  const collections = await loadBundledCollections();

  if (collections.length === 0) {
    console.log("No bundled collections found — nothing to seed.");
    return;
  }

  console.log(
    `Seeding ${collections.length} collections${dryRun ? " (dry run)" : ""}…`,
  );

  if (dryRun) {
    for (const col of collections) {
      console.log(`  ${col.slug} — ${col.name}`);
    }
    return;
  }

  const slugs = collections.map((c) => c.slug);

  for (let i = 0; i < collections.length; i += 1) {
    const col = collections[i];
    const data = collectionToRow(col, i);
    const row = await prisma.catalogCollection.upsert({
      where: { slug: col.slug },
      create: data,
      update: {
        parentSlug: data.parentSlug,
        sortOrder: data.sortOrder,
        visible: data.visible,
        conditions: data.conditions,
        metadata: data.metadata,
      },
    });
    await seedEntityTranslations(prisma, "CatalogCollection", row.id, {
      nameEn: col.name,
      nameAr: col.name,
      descriptionEn: col.description ?? "",
      descriptionAr: col.description ?? "",
    }, [
      { field: "name", enKey: "nameEn", arKey: "nameAr" },
      { field: "description", enKey: "descriptionEn", arKey: "descriptionAr" },
    ]);
  }

  await prisma.catalogCollection.deleteMany({
    where: { slug: { notIn: slugs } },
  });

  for (const locale of SCRIPT_CATALOG_LOCALES) {
    const overrides = await loadLocaleOverrides(locale);
    for (const { slug, overrides: patch } of overrides) {
      const row = await prisma.catalogCollection.findUnique({ where: { slug } });
      if (!row) continue;
      const name =
        typeof patch.name === "string" && patch.name.trim() ? patch.name : undefined;
      const description =
        typeof patch.description === "string" ? patch.description : undefined;
      if (!name && description === undefined) continue;
      await seedEntityTranslations(
        prisma,
        "CatalogCollection",
        row.id,
        {
          nameEn: name ?? "",
          nameAr: name ?? "",
          descriptionEn: description ?? "",
          descriptionAr: description ?? "",
        },
        [
          { field: "name", enKey: "nameEn", arKey: "nameAr" },
          { field: "description", enKey: "descriptionEn", arKey: "descriptionAr" },
        ]
      );
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
