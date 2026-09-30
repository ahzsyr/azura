#!/usr/bin/env tsx
/**
 * Seed SiteSettings table from bundled site.json (+ optional JsonStore backfill).
 *
 * Usage:
 *   npm run catalog:seed-site-settings
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import { SCRIPT_CATALOG_LOCALES } from "./locale-constants";

const prisma = new PrismaClient();
const SITE_SETTINGS_NAMESPACE = "site-settings";

async function readSiteJson(locale: string): Promise<Record<string, unknown> | null> {
  const path = join(process.cwd(), "seeds", "catalog", locale, "ui", "site.json");
  try {
    return JSON.parse(await readFile(path, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseArgs() {
  return { dryRun: process.argv.includes("--dry-run"), force: process.argv.includes("--force") };
}

async function main() {
  const { dryRun, force } = parseArgs();

  for (const locale of SCRIPT_CATALOG_LOCALES) {
    const jsonData = await readSiteJson(locale);
    const jsonStoreRow = await prisma.jsonStore.findUnique({
      where: { namespace_key: { namespace: SITE_SETTINGS_NAMESPACE, key: locale } },
    });
    const payload =
      (jsonStoreRow?.data as Record<string, unknown> | undefined) ?? jsonData ?? null;

    if (!payload) {
      console.log(`  skip ${locale}: no site.json or JsonStore row`);
      continue;
    }

    const existing = await prisma.siteSettings.findUnique({ where: { locale } });

    if (existing && !force) {
      console.log(`  skip ${locale}: SiteSettings row already exists`);
      continue;
    }

    if (dryRun) {
      console.log(`  would seed SiteSettings/${locale} (${Object.keys(payload).length} keys)`);
      continue;
    }

    await prisma.siteSettings.upsert({
      where: { locale },
      create: {
        locale,
        payload: payload as Prisma.InputJsonValue,
      },
      update: {
        payload: payload as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    console.log(`  seeded SiteSettings/${locale}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
