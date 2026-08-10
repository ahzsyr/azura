/**
 * Shared helpers for i18n migration scripts (pre- and post-migration schema).
 */
import type { PrismaClient } from "@prisma/client";
import { ENTITY_REGISTRY } from "../../src/features/translation/entity-registry";
import type { TranslatableEntityType } from "../../src/features/translation/types";

/** Registry field → pre-migration column base (from legacy-adapter REGISTRY_TO_LEGACY_FIELD). */
const REGISTRY_TO_LEGACY_FIELD: Record<string, Record<string, string>> = {
  ContentItem: {
    subtitle: "excerpt",
    shortDescription: "excerpt",
  },
  CmsPage: {
    subtitle: "excerpt",
    description: "excerpt",
  },
  Testimonial: {
    authorName: "name",
    quote: "content",
    role: "location",
  },
  SeoMeta: {
    metaTitle: "title",
    metaDescription: "description",
    ogDescription: "description",
  },
  TestimonialCollection: {
    description: "excerpt",
  },
  FaqSet: {
    description: "description",
  },
  ContentType: {
    pluralName: "labelPlural",
    description: "name",
  },
};

function resolveLegacyFieldName(entityType: string, registryField: string): string {
  return REGISTRY_TO_LEGACY_FIELD[entityType]?.[registryField] ?? registryField;
}

/** Prisma model name = entity type for all registry entries backed by a SQL table. */
export const ENTITY_TABLE_NAMES: Partial<Record<TranslatableEntityType, string>> = {
  ContentItem: "ContentItem",
  ContentCollection: "ContentCollection",
  ContentType: "ContentType",
  CmsPage: "CmsPage",
  Post: "Post",
  PostCategory: "PostCategory",
  PostTag: "PostTag",
  PostAuthor: "PostAuthor",
  Gallery: "Gallery",
  GalleryMedia: "GalleryMedia",
  Testimonial: "Testimonial",
  TestimonialCollection: "TestimonialCollection",
  FaqSet: "FaqSet",
  FaqItem: "FaqItem",
  CompanyInfo: "CompanyInfo",
  SeoMeta: "SeoMeta",
  Custom404: "Custom404",
  MediaAsset: "MediaAsset",
  ContentItemMedia: "ContentItemMedia",
};

const LEGACY_SUFFIXES = ["En", "Ar"] as const;

function isPostgresUrl(url: string | undefined): boolean {
  return !!url && /^postgres(ql)?:\/\//i.test(url);
}

export function quoteIdent(name: string, postgres: boolean): string {
  return postgres ? `"${name}"` : `\`${name}\``;
}

const EXTRA_LEGACY_FIELD_BASE: Record<string, Record<string, string>> = {
  SeoSettings: {
    siteTitle: "title",
    siteDescription: "description",
  },
};

export type LocaleSuffixMapping = {
  suffix: string;
  localeCode: string;
};

export function legacyFieldBase(entityType: string, registryField: string): string {
  return (
    EXTRA_LEGACY_FIELD_BASE[entityType]?.[registryField] ??
    resolveLegacyFieldName(entityType, registryField)
  );
}

export function legacyColumnKey(entityType: string, registryField: string, suffix: string): string {
  return `${legacyFieldBase(entityType, registryField)}${suffix}`;
}

/** Map En/Ar column suffixes to LocaleConfig.code (e.g. en, ar). */
export function buildSuffixLocaleMap(
  locales: { code: string; urlPrefix: string }[]
): LocaleSuffixMapping[] {
  const result: LocaleSuffixMapping[] = [];
  for (const suffix of LEGACY_SUFFIXES) {
    const urlPrefix = suffix === "En" ? "en" : "ar";
    const match =
      locales.find((l) => l.urlPrefix.toLowerCase() === urlPrefix) ??
      locales.find((l) => l.code.toLowerCase() === urlPrefix) ??
      locales.find((l) => l.code.toLowerCase().startsWith(urlPrefix));
    if (match) {
      result.push({ suffix, localeCode: match.code });
    }
  }
  return result;
}

export async function tableHasColumn(
  prisma: PrismaClient,
  table: string,
  column: string
): Promise<boolean> {
  const postgres = isPostgresUrl(process.env.DATABASE_URL);
  if (postgres) {
    const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
      `SELECT COUNT(*)::bigint AS cnt FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
      table,
      column
    );
    return Number(rows[0]?.cnt ?? 0) > 0;
  }

  const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

let localeColumnCache: Map<string, "localeCode" | "languageCode"> | null = null;

/** EntityTranslation / UiMessage / LocalizedSlug use localeCode post-migration, languageCode pre-migration. */
export async function detectLocaleColumn(
  prisma: PrismaClient,
  table: string
): Promise<"localeCode" | "languageCode"> {
  if (!localeColumnCache) localeColumnCache = new Map();
  const cached = localeColumnCache.get(table);
  if (cached) return cached;

  if (await tableHasColumn(prisma, table, "localeCode")) {
    localeColumnCache.set(table, "localeCode");
    return "localeCode";
  }
  if (await tableHasColumn(prisma, table, "languageCode")) {
    localeColumnCache.set(table, "languageCode");
    return "languageCode";
  }
  throw new Error(`Table ${table} has neither localeCode nor languageCode`);
}

export function collectLegacyColumns(entityType: TranslatableEntityType): string[] {
  const config = ENTITY_REGISTRY[entityType];
  const columns = new Set<string>(["id"]);
  for (const fieldDef of config.fields) {
    for (const suffix of LEGACY_SUFFIXES) {
      columns.add(legacyColumnKey(entityType, fieldDef.field, suffix));
    }
  }
  if (config.slugField) {
    columns.add(config.slugField);
  }
  return [...columns];
}

export async function fetchEntitiesRaw(
  prisma: PrismaClient,
  table: string,
  wantedColumns: string[]
): Promise<Record<string, unknown>[]> {
  const postgres = isPostgresUrl(process.env.DATABASE_URL);
  const columns: string[] = [];
  for (const col of wantedColumns) {
    if (await tableHasColumn(prisma, table, col)) {
      columns.push(col);
    }
  }
  if (!columns.includes("id") && (await tableHasColumn(prisma, table, "id"))) {
    columns.unshift("id");
  }
  if (columns.length === 0) return [];

  const quoted = columns.map((c) => quoteIdent(c, postgres)).join(", ");
  const tableQ = quoteIdent(table, postgres);
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${quoted} FROM ${tableQ}`
  );
}

export async function upsertEntityTranslation(
  prisma: PrismaClient,
  input: {
    entityType: string;
    entityId: string;
    field: string;
    localeCode: string;
    value: string;
  }
): Promise<void> {
  const postgres = isPostgresUrl(process.env.DATABASE_URL);
  const localeCol = await detectLocaleColumn(prisma, "EntityTranslation");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 25);

  if (postgres) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "EntityTranslation" ("id", "entityType", "entityId", "field", "${localeCol}", "value", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED', NOW(), NOW())
       ON CONFLICT ("entityType", "entityId", "field", "${localeCol}")
       DO UPDATE SET "value" = EXCLUDED."value", "status" = 'PUBLISHED', "updatedAt" = NOW()`,
      id,
      input.entityType,
      input.entityId,
      input.field,
      input.localeCode,
      input.value
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`EntityTranslation\` (\`id\`, \`entityType\`, \`entityId\`, \`field\`, \`${localeCol}\`, \`value\`, \`status\`, \`createdAt\`, \`updatedAt\`)
     VALUES (?, ?, ?, ?, ?, ?, 'PUBLISHED', NOW(3), NOW(3))
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`status\` = 'PUBLISHED', \`updatedAt\` = NOW(3)`,
    id,
    input.entityType,
    input.entityId,
    input.field,
    input.localeCode,
    input.value
  );
}

export async function upsertLocalizedSlug(
  prisma: PrismaClient,
  input: {
    entityType: string;
    entityId: string;
    localeCode: string;
    slug: string;
  }
): Promise<void> {
  const postgres = isPostgresUrl(process.env.DATABASE_URL);
  const localeCol = await detectLocaleColumn(prisma, "LocalizedSlug");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 25);

  if (postgres) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "LocalizedSlug" ("id", "entityType", "entityId", "${localeCol}", "slug", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT ("entityType", "entityId", "${localeCol}")
       DO UPDATE SET "slug" = EXCLUDED."slug", "updatedAt" = NOW()`,
      id,
      input.entityType,
      input.entityId,
      input.localeCode,
      input.slug
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`LocalizedSlug\` (\`id\`, \`entityType\`, \`entityId\`, \`${localeCol}\`, \`slug\`, \`createdAt\`, \`updatedAt\`)
     VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))
     ON DUPLICATE KEY UPDATE \`slug\` = VALUES(\`slug\`), \`updatedAt\` = NOW(3)`,
    id,
    input.entityType,
    input.entityId,
    input.localeCode,
    input.slug
  );
}

export async function upsertUiMessage(
  prisma: PrismaClient,
  input: {
    namespace: string;
    key: string;
    localeCode: string;
    value: string;
  }
): Promise<void> {
  const postgres = isPostgresUrl(process.env.DATABASE_URL);
  const localeCol = await detectLocaleColumn(prisma, "UiMessage");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 25);

  if (postgres) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "UiMessage" ("id", "namespace", "key", "${localeCol}", "value", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'PUBLISHED', NOW(), NOW())
       ON CONFLICT ("namespace", "key", "${localeCol}")
       DO UPDATE SET "value" = EXCLUDED."value", "status" = 'PUBLISHED', "updatedAt" = NOW()`,
      id,
      input.namespace,
      input.key,
      input.localeCode,
      input.value
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`UiMessage\` (\`id\`, \`namespace\`, \`key\`, \`${localeCol}\`, \`value\`, \`status\`, \`createdAt\`, \`updatedAt\`)
     VALUES (?, ?, ?, ?, ?, 'PUBLISHED', NOW(3), NOW(3))
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`updatedAt\` = NOW(3)`,
    id,
    input.namespace,
    input.key,
    input.localeCode,
    input.value
  );
}

export function resolveMessageLocaleCode(
  fileStem: string,
  locales: { code: string; urlPrefix: string }[]
): string {
  const stem = fileStem.toLowerCase();
  const match =
    locales.find((l) => l.code.toLowerCase() === stem) ??
    locales.find((l) => l.urlPrefix.toLowerCase() === stem);
  return match?.code ?? stem;
}

export function listRegistryEntityTypes(): TranslatableEntityType[] {
  return Object.keys(ENTITY_REGISTRY) as TranslatableEntityType[];
}
