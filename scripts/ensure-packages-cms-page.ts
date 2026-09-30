/**
 * Ensures the wired /packages CMS page exists (idempotent).
 * Run: npx tsx scripts/ensure-packages-cms-page.ts
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { buildDefaultPageBlocks, isEmptyBlocks } from "../src/features/cms/page-default-blocks";
import { seedBilingualFields } from "./i18n/seed-translations-helper";

async function main() {
  const slug = "packages";
  const defaultBlocks = buildDefaultPageBlocks(slug, "packages") as Prisma.InputJsonValue;
  const existing = await prisma.cmsPage.findUnique({ where: { slug } });

  const page = await prisma.cmsPage.upsert({
    where: { slug },
    update: {
      ...(existing && isEmptyBlocks(existing.blocks) ? { blocks: defaultBlocks } : {}),
    },
    create: {
      slug,
      templateKey: "packages",
      status: "DRAFT",
      blocks: defaultBlocks,
    },
  });

  if (!existing) {
    await seedBilingualFields(prisma, "CmsPage", page.id, {
      title: { en: "Packages", ar: "الباقات" },
      subtitle: { en: "", ar: "" },
    });
  }

  console.log(`[ensure-packages-cms-page] ${existing ? "updated" : "created"} id=${page.id} slug=${page.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
