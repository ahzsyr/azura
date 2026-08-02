/**
 * Backfill EntityTranslation, LocalizedSlug, and UiMessage from pre-migration data.
 * Run against a database that still has *En/*Ar columns (before translation-only migration).
 *
 * Run: npx tsx scripts/i18n/backfill-translations.ts
 */
import { PrismaClient } from "@prisma/client";
import { ENTITY_REGISTRY } from "../../src/features/translation/entity-registry";
import type { TranslatableEntityType } from "../../src/features/translation/types";
import {
  buildSuffixLocaleMap,
  collectLegacyColumns,
  ENTITY_TABLE_NAMES,
  fetchEntitiesRaw,
  legacyColumnKey,
  legacyFieldBase,
  listRegistryEntityTypes,
  resolveMessageLocaleCode,
  tableHasColumn,
  upsertEntityTranslation,
  upsertLocalizedSlug,
  upsertUiMessage,
} from "./migration-utils";

const prisma = new PrismaClient();

async function backfillEntityTypeFromCanonical(entityType: TranslatableEntityType) {
  const config = ENTITY_REGISTRY[entityType];
  const table = ENTITY_TABLE_NAMES[entityType];
  if (!table) return { translations: 0, slugs: 0 };

  const locales = await prisma.localeConfig.findMany({
    where: { isEnabled: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  const defaultLocale = locales.find((l) => l.isDefault) ?? locales[0];
  if (!defaultLocale) return { translations: 0, slugs: 0 };

  const canonicalColumns = new Set<string>(["id"]);
  for (const fieldDef of config.fields) {
    canonicalColumns.add(fieldDef.field);
    canonicalColumns.add(legacyFieldBase(entityType, fieldDef.field));
  }
  if (config.slugField) canonicalColumns.add(config.slugField);

  const entities = await fetchEntitiesRaw(prisma, table, [...canonicalColumns]);
  if (entities.length === 0) return { translations: 0, slugs: 0 };

  let translations = 0;
  let slugs = 0;

  for (const entity of entities) {
    const entityId = String(entity.id);
    for (const fieldDef of config.fields) {
      const base = legacyFieldBase(entityType, fieldDef.field);
      const value = entity[fieldDef.field] ?? entity[base];
      if (typeof value !== "string" || !value.trim()) continue;
      await upsertEntityTranslation(prisma, {
        entityType,
        entityId,
        field: fieldDef.field,
        localeCode: defaultLocale.code,
        value: value.trim(),
      });
      translations++;
    }

    if (config.slugField) {
      const slugValue = entity[config.slugField];
      if (typeof slugValue === "string" && slugValue.trim()) {
        await upsertLocalizedSlug(prisma, {
          entityType,
          entityId,
          localeCode: defaultLocale.code,
          slug: slugValue.trim(),
        });
        slugs++;
      }
    }
  }

  if (translations > 0 || slugs > 0) {
    console.log(`  ${entityType} (canonical): ${translations} translations, ${slugs} slugs`);
  }
  return { translations, slugs };
}

async function backfillEntityType(entityType: TranslatableEntityType) {
  const config = ENTITY_REGISTRY[entityType];
  const table = ENTITY_TABLE_NAMES[entityType];
  if (!table) {
    console.log(`  Skip ${entityType} — no SQL table (JSON/platform entity)`);
    return { translations: 0, slugs: 0 };
  }

  const locales = await prisma.localeConfig.findMany({
    where: { isEnabled: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  const suffixLocales = buildSuffixLocaleMap(locales);
  if (suffixLocales.length === 0) {
    console.log(`  Skip ${entityType} — no En/Ar locale mapping in LocaleConfig`);
    return { translations: 0, slugs: 0 };
  }

  const wantedColumns = collectLegacyColumns(entityType);
  const hasLegacy = await Promise.all(
    suffixLocales.flatMap(({ suffix }) =>
      config.fields.map((f) => tableHasColumn(prisma, table, legacyColumnKey(entityType, f.field, suffix)))
    )
  );
  if (!hasLegacy.some(Boolean)) {
    console.log(`  Skip ${entityType} — no legacy En/Ar columns on table`);
    return backfillEntityTypeFromCanonical(entityType);
  }

  const entities = await fetchEntitiesRaw(prisma, table, wantedColumns);
  let translations = 0;
  let slugs = 0;

  for (const entity of entities) {
    const entityId = String(entity.id);

    for (const { suffix, localeCode } of suffixLocales) {
      for (const fieldDef of config.fields) {
        const columnKey = legacyColumnKey(entityType, fieldDef.field, suffix);
        const value = entity[columnKey];
        if (typeof value !== "string" || !value.trim()) continue;

        // localeCode column post-migration; languageCode pre-migration (see migration-utils)
        await upsertEntityTranslation(prisma, {
          entityType,
          entityId,
          field: fieldDef.field,
          localeCode,
          value: value.trim(),
        });
        translations++;
      }
    }

    if (config.slugField) {
      const slugValue = entity[config.slugField];
      if (typeof slugValue === "string" && slugValue.trim()) {
        for (const locale of locales) {
          await upsertLocalizedSlug(prisma, {
            entityType,
            entityId,
            localeCode: locale.code,
            slug: slugValue.trim(),
          });
          slugs++;
        }
      }
    }
  }

  console.log(`  ${entityType}: ${translations} translations, ${slugs} localized slugs`);
  return { translations, slugs };
}

async function backfillUiMessages() {
  const fs = await import("fs/promises");
  const path = await import("path");
  const messagesDir = path.join(process.cwd(), "messages");
  const locales = await prisma.localeConfig.findMany({ where: { isEnabled: true } });

  let count = 0;
  let files: string[];
  try {
    files = await fs.readdir(messagesDir);
  } catch {
    console.log("  No messages/ directory found");
    return 0;
  }

  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const fileStem = file.replace(/\.json$/, "");
    const localeCode = resolveMessageLocaleCode(fileStem, locales);
    const content = JSON.parse(await fs.readFile(path.join(messagesDir, file), "utf-8"));
    const entries: { namespace: string; key: string; localeCode: string; value: string }[] = [];

    function walk(obj: Record<string, unknown>, prefix: string) {
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof v === "string") {
          entries.push({ namespace: "root", key: fullKey, localeCode, value: v });
        } else if (v && typeof v === "object" && !Array.isArray(v)) {
          walk(v as Record<string, unknown>, fullKey);
        }
      }
    }

    walk(content, "");

    for (const entry of entries) {
      await upsertUiMessage(prisma, entry);
      count++;
    }

    console.log(`  UI messages (${localeCode}): ${entries.length} keys imported`);
  }

  return count;
}

async function main() {
  console.log("Backfilling translations from legacy En/Ar columns...\n");

  let totalTranslations = 0;
  let totalSlugs = 0;

  for (const entityType of listRegistryEntityTypes()) {
    const { translations, slugs } = await backfillEntityType(entityType);
    totalTranslations += translations;
    totalSlugs += slugs;
  }

  console.log("\nBackfilling UI messages from messages/*.json...\n");
  const uiCount = await backfillUiMessages();

  console.log(
    `\nDone. Entity translations: ${totalTranslations}, localized slugs: ${totalSlugs}, UI messages: ${uiCount}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
