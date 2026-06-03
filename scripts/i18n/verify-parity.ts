/**
 * Verify EntityTranslation rows match legacy *En/*Ar columns for enabled locales.
 * Run: npx tsx scripts/i18n/verify-parity.ts
 * Exit code 1 on mismatch (for CI).
 */
import { PrismaClient } from "@prisma/client";
import { ENTITY_REGISTRY } from "../../src/features/translation/entity-registry";
import {
  legacyColumnKey,
  localeHasLegacyColumn,
  resolveLegacyFieldName,
} from "../../src/features/translation/legacy-adapter";

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
    entityType: "Testimonial",
    fetchAll: async () =>
      prisma.testimonial.findMany({
        select: { id: true, contentEn: true, contentAr: true },
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
          addressEn: true,
          addressAr: true,
        },
      }) as Promise<Record<string, unknown>[]>,
  },
];

async function verifyEntityType(target: BackfillTarget) {
  const config = ENTITY_REGISTRY[target.entityType as keyof typeof ENTITY_REGISTRY];
  if (!config?.legacyFields?.length) {
    console.log(`  Skip ${target.entityType} — no legacy fields`);
    return { mismatches: 0, missing: 0 };
  }

  const locales = await prisma.localeConfig.findMany({ where: { isEnabled: true } });
  const legacyLocales = locales.filter((l) => localeHasLegacyColumn(l.code));
  const entities = await target.fetchAll();
  let mismatches = 0;
  let missing = 0;

  for (const entity of entities) {
    const entityId = String(entity.id);

    for (const locale of legacyLocales) {
      for (const registryField of config.fields.map((f) => f.field)) {
        if (!config.legacyFields.includes(resolveLegacyFieldName(target.entityType, registryField))) {
          const legacyName = resolveLegacyFieldName(target.entityType, registryField);
          if (!config.legacyFields.includes(legacyName) && !config.legacyFields.includes(registryField)) {
            continue;
          }
        }

        const legacyField = config.legacyFields.includes(registryField)
          ? registryField
          : resolveLegacyFieldName(target.entityType, registryField);

        if (!config.legacyFields.includes(legacyField)) continue;

        const columnKey = legacyColumnKey(legacyField, locale.code);
        const legacyValue = entity[columnKey];
        if (typeof legacyValue !== "string" || !legacyValue.trim()) continue;

        const row = await prisma.entityTranslation.findUnique({
          where: {
            entityType_entityId_field_languageCode: {
              entityType: target.entityType,
              entityId,
              field: registryField,
              languageCode: locale.code,
            },
          },
        });

        if (!row?.value.trim()) {
          missing++;
          console.warn(
            `  MISSING ET: ${target.entityType}/${entityId} ${registryField}@${locale.code} (legacy has value)`
          );
          continue;
        }

        if (row.value.trim() !== legacyValue.trim()) {
          mismatches++;
          console.warn(
            `  MISMATCH: ${target.entityType}/${entityId} ${registryField}@${locale.code}`
          );
        }
      }
    }
  }

  return { mismatches, missing };
}

async function main() {
  console.log("Verifying EntityTranslation ↔ legacy column parity...\n");
  let totalMismatches = 0;
  let totalMissing = 0;

  for (const target of TARGETS) {
    const { mismatches, missing } = await verifyEntityType(target);
    totalMismatches += mismatches;
    totalMissing += missing;
    console.log(`  ${target.entityType}: ${mismatches} mismatches, ${missing} missing ET rows`);
  }

  console.log(`\nTotal: ${totalMismatches} mismatches, ${totalMissing} missing`);
  if (totalMismatches > 0 || totalMissing > 0) {
    console.log("\nRun: npm run i18n:backfill");
    process.exit(1);
  }
  console.log("\nParity OK.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
