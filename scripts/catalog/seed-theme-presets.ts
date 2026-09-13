#!/usr/bin/env tsx
/**
 * Seed theme presets into JsonStore (theme-presets namespace).
 *
 * Usage:
 *   npm run catalog:seed-theme-presets
 *   npm run catalog:seed-theme-presets -- --force
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const PRESETS_DIR = join(process.cwd(), "seeds", "catalog", "presets");
const NAMESPACE = "theme-presets";

async function main() {
  const force = process.argv.includes("--force");
  const files = (await readdir(PRESETS_DIR)).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const id = file.replace(/\.json$/, "");
    const existing = await prisma.jsonStore.findUnique({
      where: { namespace_key: { namespace: NAMESPACE, key: id } },
    });
    if (existing && !force) continue;

    const data = JSON.parse(await readFile(join(PRESETS_DIR, file), "utf-8")) as Prisma.InputJsonValue;
    await prisma.jsonStore.upsert({
      where: { namespace_key: { namespace: NAMESPACE, key: id } },
      create: { namespace: NAMESPACE, key: id, data },
      update: { data },
    });
    console.log(`${existing ? "Updated" : "Seeded"} theme preset: ${id}`);
  }

  console.log(`Theme presets seeded (${files.length} files).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
