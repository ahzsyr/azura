#!/usr/bin/env tsx
/**
 * Ensure all wired CMS pages exist; remove deprecated slugs (e.g. visa).
 * Usage: npm run cms:ensure-pages
 */
import { PrismaClient } from "@prisma/client";
import { ensureWiredCmsPagesWithClient } from "../src/features/cms/ensure-wired-cms-pages-core";

const prisma = new PrismaClient();

async function main() {
  console.log("Ensuring wired CMS pages…");
  const result = await ensureWiredCmsPagesWithClient(prisma);
  for (const slug of result.existing) {
    console.log(`  exists: ${slug}`);
  }
  for (const slug of result.created) {
    console.log(`  created: ${slug}`);
  }
  for (const slug of result.removed) {
    console.log(`  removed deprecated: ${slug}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
