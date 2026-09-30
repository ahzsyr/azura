import type { Prisma, PrismaClient } from "@prisma/client";
import {
  CMS_WIRED_PAGE_DEFINITIONS,
  DEPRECATED_CMS_PAGE_SLUGS,
} from "@/features/cms/cms-wired-pages";

const EMPTY_BLOCKS: Prisma.InputJsonValue = [];

export type EnsureWiredCmsPagesResult = {
  created: string[];
  existing: string[];
  removed: string[];
};

type EnsureDb = Pick<
  PrismaClient,
  "cmsPage" | "entityTranslation" | "searchDocument"
>;

async function seedPageTitles(
  db: EnsureDb,
  entityId: string,
  titles: { en: string; ar: string },
) {
  for (const [localeCode, value] of [
    ["en", titles.en],
    ["ar", titles.ar],
  ] as const) {
    await db.entityTranslation.upsert({
      where: {
        entityType_entityId_field_localeCode: {
          entityType: "CmsPage",
          entityId,
          field: "title",
          localeCode,
        },
      },
      create: {
        entityType: "CmsPage",
        entityId,
        field: "title",
        localeCode,
        value,
        status: "PUBLISHED",
      },
      update: { value, status: "PUBLISHED" },
    });
  }
  for (const localeCode of ["en", "ar"] as const) {
    await db.entityTranslation.upsert({
      where: {
        entityType_entityId_field_localeCode: {
          entityType: "CmsPage",
          entityId,
          field: "subtitle",
          localeCode,
        },
      },
      create: {
        entityType: "CmsPage",
        entityId,
        field: "subtitle",
        localeCode,
        value: "",
        status: "PUBLISHED",
      },
      update: {},
    });
  }
}

/** Upsert all wired CMS page definitions and remove deprecated slugs. */
export async function ensureWiredCmsPagesWithClient(
  db: EnsureDb,
): Promise<EnsureWiredCmsPagesResult> {
  const created: string[] = [];
  const existing: string[] = [];
  const removed: string[] = [];

  for (const page of CMS_WIRED_PAGE_DEFINITIONS) {
    const prior = await db.cmsPage.findUnique({ where: { slug: page.slug } });
    const row = await db.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: {
        slug: page.slug,
        templateKey: page.templateKey,
        status: "DRAFT",
        blocks: EMPTY_BLOCKS,
      },
    });

    if (!prior) {
      created.push(page.slug);
      await seedPageTitles(db, row.id, page.defaultTitles);
    } else {
      existing.push(page.slug);
    }
  }

  for (const slug of DEPRECATED_CMS_PAGE_SLUGS) {
    const deprecated = await db.cmsPage.findUnique({ where: { slug } });
    if (!deprecated) continue;
    await db.searchDocument.deleteMany({
      where: { entityType: "CMS_PAGE", entityId: deprecated.id },
    });
    await db.cmsPage.delete({ where: { slug } });
    removed.push(slug);
  }

  return { created, existing, removed };
}
