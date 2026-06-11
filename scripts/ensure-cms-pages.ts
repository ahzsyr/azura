#!/usr/bin/env tsx
/**
 * Ensure all wired CMS pages exist; remove deprecated slugs (e.g. visa).
 * Usage: npm run cms:ensure-pages
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import {
  CMS_WIRED_PAGE_DEFINITIONS,
  DEPRECATED_CMS_PAGE_SLUGS,
} from "../src/features/cms/cms-wired-pages";

const prisma = new PrismaClient();

const EMPTY_BLOCKS: Prisma.InputJsonValue = [];

async function main() {
  console.log("Ensuring wired CMS pages…");

  for (const page of CMS_WIRED_PAGE_DEFINITIONS) {
    const existing = await prisma.cmsPage.findUnique({ where: { slug: page.slug } });
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: {
        ...(existing && !existing.titleEn.trim() ? { titleEn: page.titleEn } : {}),
        ...(existing && !existing.titleAr.trim() ? { titleAr: page.titleAr } : {}),
      },
      create: {
        slug: page.slug,
        titleEn: page.titleEn,
        titleAr: page.titleAr,
        templateKey: page.templateKey,
        status: "DRAFT",
        blocks: EMPTY_BLOCKS,
        excerptEn: "",
        excerptAr: "",
      },
    });
    console.log(`  ${existing ? "exists" : "created"}: ${page.slug}`);
  }

  for (const slug of DEPRECATED_CMS_PAGE_SLUGS) {
    const deprecated = await prisma.cmsPage.findUnique({ where: { slug } });
    if (deprecated) {
      await prisma.searchDocument.deleteMany({
        where: { entityType: "CMS_PAGE", entityId: deprecated.id },
      });
      await prisma.cmsPage.delete({ where: { slug } });
      console.log(`  removed deprecated: ${slug}`);
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
