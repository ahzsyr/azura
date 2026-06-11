/**
 * Backfill EntityTranslation rows from legacy *En/*Ar columns.
 * Run: npx tsx scripts/i18n/backfill-translations.ts
 */
import { PrismaClient } from "@prisma/client";
import { ENTITY_REGISTRY } from "../../src/features/translation/entity-registry";
import { resolveLegacyFieldName } from "../../src/features/translation/legacy-adapter";

const prisma = new PrismaClient();

type BackfillTarget = {
  entityType: string;
  fetchAll: () => Promise<Record<string, unknown>[]>;
};

const TARGETS: BackfillTarget[] = [
  {
    entityType: "ContentItem",
    fetchAll: async () =>
      prisma.contentItem.findMany({
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          descriptionEn: true,
          descriptionAr: true,
        },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "CmsPage",
    fetchAll: async () =>
      prisma.cmsPage.findMany({
        select: { id: true, titleEn: true, titleAr: true, excerptEn: true, excerptAr: true },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "Post",
    fetchAll: async () =>
      prisma.post.findMany({
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          contentEn: true,
          contentAr: true,
        },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "Gallery",
    fetchAll: async () =>
      prisma.gallery.findMany({
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          descriptionEn: true,
          descriptionAr: true,
          infoEn: true,
          infoAr: true,
        },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "FaqSet",
    fetchAll: async () =>
      prisma.faqSet.findMany({
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          descriptionEn: true,
          descriptionAr: true,
        },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "FaqItem",
    fetchAll: async () =>
      prisma.faqItem.findMany({
        select: {
          id: true,
          questionEn: true,
          questionAr: true,
          answerEn: true,
          answerAr: true,
        },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "ContentCollection",
    fetchAll: async () =>
      prisma.contentCollection.findMany({
        select: { id: true, nameEn: true, nameAr: true, excerptEn: true, excerptAr: true },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "Testimonial",
    fetchAll: async () =>
      prisma.testimonial.findMany({
        select: { id: true, contentEn: true, contentAr: true, name: true, location: true },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "CompanyInfo",
    fetchAll: async () =>
      prisma.companyInfo.findMany({
        select: {
          id: true,
          taglineEn: true,
          taglineAr: true,
          storyEn: true,
          storyAr: true,
          missionEn: true,
          missionAr: true,
          addressEn: true,
          addressAr: true,
        },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "Gallery",
    fetchAll: async () =>
      prisma.gallery.findMany({
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          descriptionEn: true,
          descriptionAr: true,
        },
      }) as Promise<Record<string, unknown>[]>,
  },
  {
    entityType: "ContentType",
    fetchAll: async () =>
      prisma.contentType.findMany({
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          labelSingularEn: true,
          labelSingularAr: true,
          labelPluralEn: true,
          labelPluralAr: true,
        },
      }) as Promise<Record<string, unknown>[]>,
  },
];

const LOCALE_SUFFIX_MAP: Record<string, string> = {
  en: "En",
  ar: "Ar",
};

async function backfillEntityType(target: BackfillTarget) {
  const config = ENTITY_REGISTRY[target.entityType as keyof typeof ENTITY_REGISTRY];
  if (!config?.legacyFields) {
    console.log(`Skipping ${target.entityType} — no legacy fields defined`);
    return 0;
  }

  const locales = await prisma.localeConfig.findMany({ where: { isEnabled: true } });
  const entities = await target.fetchAll();
  let count = 0;

  for (const entity of entities) {
    const entityId = String(entity.id);

    for (const locale of locales) {
      const suffix =
        LOCALE_SUFFIX_MAP[locale.code.toLowerCase()] ??
        locale.code.charAt(0).toUpperCase() + locale.code.slice(1).toLowerCase();

      for (const fieldDef of config.fields) {
        const legacyField = resolveLegacyFieldName(target.entityType, fieldDef.field);
        if (config.legacyFields && !config.legacyFields.includes(legacyField)) continue;

        const columnKey = `${legacyField}${suffix}`;
        const value = entity[columnKey];
        if (typeof value !== "string" || !value.trim()) continue;

        await prisma.entityTranslation.upsert({
          where: {
            entityType_entityId_field_languageCode: {
              entityType: target.entityType,
              entityId,
              field: fieldDef.field,
              languageCode: locale.code,
            },
          },
          create: {
            entityType: target.entityType,
            entityId,
            field: fieldDef.field,
            languageCode: locale.code,
            value,
            status: "PUBLISHED",
          },
          update: { value, status: "PUBLISHED" },
        });
        count++;
      }
    }
  }

  console.log(`  ${target.entityType}: ${count} translations upserted`);
  return count;
}

async function backfillUiMessages() {
  const fs = await import("fs/promises");
  const path = await import("path");
  const messagesDir = path.join(process.cwd(), "messages");

  let count = 0;
  const files = await fs.readdir(messagesDir);

  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const languageCode = file.replace(".json", "");
    const content = JSON.parse(await fs.readFile(path.join(messagesDir, file), "utf-8"));
    const entries: { namespace: string; key: string; languageCode: string; value: string }[] = [];

    function walk(obj: Record<string, unknown>, prefix: string) {
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof v === "string") {
          entries.push({ namespace: "root", key: fullKey, languageCode, value: v });
        } else if (v && typeof v === "object") {
          walk(v as Record<string, unknown>, fullKey);
        }
      }
    }

    walk(content, "");

    for (const entry of entries) {
      await prisma.uiMessage.upsert({
        where: {
          namespace_key_languageCode: {
            namespace: entry.namespace,
            key: entry.key,
            languageCode: entry.languageCode,
          },
        },
        create: { ...entry, status: "PUBLISHED" },
        update: { value: entry.value },
      });
      count++;
    }

    console.log(`  UI messages (${languageCode}): ${entries.length} keys imported`);
  }

  return count;
}

async function main() {
  console.log("Backfilling translations from legacy columns...\n");
  let total = 0;

  for (const target of TARGETS) {
    total += await backfillEntityType(target);
  }

  console.log("\nBackfilling UI messages from JSON files...\n");
  await backfillUiMessages();

  console.log(`\nDone. Total entity translations: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
