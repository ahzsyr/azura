import "server-only";

import type { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contentTypeSchema } from "@/schemas/content/content-type";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import { mergeSearchDefaultsIntoAdminConfig } from "@/features/content/generate-search-profile-defaults";
import type { ContentFieldDefinition } from "@/features/content/types";

export const CONTENT_TYPE_EXPORT_VERSION = 1;

export type ContentTypeExportDocument = {
  version: typeof CONTENT_TYPE_EXPORT_VERSION;
  contentType: {
    slug: string;
    icon: string;
    routePrefix: string | null;
    isEnabled: boolean;
    sortOrder: number;
    fieldSchema: ContentFieldDefinition[];
    displaySchema: Record<string, unknown>;
    adminConfig: Record<string, unknown>;
    translations: Record<string, Record<string, string>>;
  };
  items: Array<{
    slug: string;
    status: ContentStatus;
    isFeatured: boolean;
    isVisible: boolean;
    sortOrder: number;
    attributes: Record<string, unknown>;
    blocks: unknown;
    displaySettings: Record<string, unknown>;
    translations: Record<string, Record<string, string>>;
  }>;
};

export type ContentTypeImportOptions = {
  dryRun?: boolean;
  duplicatePolicy?: "overwrite" | "skip";
};

export type ContentTypeImportRowResult = {
  slug: string;
  status: "created" | "updated" | "skipped" | "error";
  errors: string[];
};

export type ContentTypeImportResult = {
  dryRun: boolean;
  contentTypeSlug: string;
  contentTypeId?: string;
  aggregate: { created: number; updated: number; skipped: number; error: number; total: number };
  rows: ContentTypeImportRowResult[];
};

function parseRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function groupTranslations(
  rows: { field: string; localeCode: string; value: string }[],
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    out[row.field] ??= {};
    out[row.field][row.localeCode] = row.value;
  }
  return out;
}

export async function exportContentType(typeId: string): Promise<ContentTypeExportDocument> {
  const type = await prisma.contentType.findUniqueOrThrow({ where: { id: typeId } });
  const [typeTranslations, items] = await Promise.all([
    prisma.entityTranslation.findMany({ where: { entityType: "ContentType", entityId: typeId } }),
    prisma.contentItem.findMany({
      where: { contentTypeId: typeId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const itemIds = items.map((item) => item.id);
  const itemTranslations =
    itemIds.length > 0
      ? await prisma.entityTranslation.findMany({
          where: { entityType: "ContentItem", entityId: { in: itemIds } },
        })
      : [];

  const translationsByItem = new Map<string, typeof itemTranslations>();
  for (const row of itemTranslations) {
    const list = translationsByItem.get(row.entityId) ?? [];
    list.push(row);
    translationsByItem.set(row.entityId, list);
  }

  const fieldSchema = resolveFieldSchema(type, type.slug);

  return {
    version: CONTENT_TYPE_EXPORT_VERSION,
    contentType: {
      slug: type.slug,
      icon: type.icon,
      routePrefix: type.routePrefix,
      isEnabled: type.isEnabled,
      sortOrder: type.sortOrder,
      fieldSchema,
      displaySchema: parseRecord(type.displaySchema),
      adminConfig: parseRecord(type.adminConfig),
      translations: groupTranslations(typeTranslations),
    },
    items: items.map((item) => ({
      slug: item.slug ?? item.id,
      status: item.status,
      isFeatured: item.isFeatured,
      isVisible: item.isVisible,
      sortOrder: item.sortOrder,
      attributes: parseRecord(item.attributes),
      blocks: item.blocks,
      displaySettings: parseRecord(item.displaySettings),
      translations: groupTranslations(translationsByItem.get(item.id) ?? []),
    })),
  };
}

async function upsertTypeTranslations(
  entityId: string,
  translations: Record<string, Record<string, string>>,
) {
  const inputs = Object.entries(translations).flatMap(([field, byLocale]) =>
    Object.entries(byLocale).map(([localeCode, value]) => ({
      entityType: "ContentType",
      entityId,
      field,
      localeCode,
      value,
      status: "PUBLISHED" as const,
    })),
  );
  if (inputs.length === 0) return;
  await prisma.$transaction(
    inputs.map((input) =>
      prisma.entityTranslation.upsert({
        where: {
          entityType_entityId_field_localeCode: {
            entityType: input.entityType,
            entityId: input.entityId,
            field: input.field,
            localeCode: input.localeCode,
          },
        },
        create: input,
        update: { value: input.value, status: input.status },
      }),
    ),
  );
}

async function upsertItemTranslations(
  entityId: string,
  translations: Record<string, Record<string, string>>,
) {
  const inputs = Object.entries(translations).flatMap(([field, byLocale]) =>
    Object.entries(byLocale).map(([localeCode, value]) => ({
      entityType: "ContentItem",
      entityId,
      field,
      localeCode,
      value,
      status: "PUBLISHED" as const,
    })),
  );
  if (inputs.length === 0) return;
  await prisma.$transaction(
    inputs.map((input) =>
      prisma.entityTranslation.upsert({
        where: {
          entityType_entityId_field_localeCode: {
            entityType: input.entityType,
            entityId: input.entityId,
            field: input.field,
            localeCode: input.localeCode,
          },
        },
        create: input,
        update: { value: input.value, status: input.status },
      }),
    ),
  );
}

export async function importContentTypeDocument(
  raw: unknown,
  options: ContentTypeImportOptions = {},
): Promise<ContentTypeImportResult> {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid import document");
  }
  const doc = raw as ContentTypeExportDocument;
  if (doc.version !== CONTENT_TYPE_EXPORT_VERSION) {
    throw new Error(`Unsupported export version: ${String((doc as { version?: unknown }).version)}`);
  }
  if (!doc.contentType?.slug) {
    throw new Error("contentType.slug is required");
  }

  const duplicatePolicy = options.duplicatePolicy ?? "overwrite";
  const dryRun = options.dryRun === true;

  const fieldSchema = contentTypeSchema.shape.fieldSchema.parse(doc.contentType.fieldSchema ?? []);
  const adminConfig = mergeSearchDefaultsIntoAdminConfig(
    parseRecord(doc.contentType.adminConfig),
    fieldSchema,
  );

  const rows: ContentTypeImportRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let error = 0;

  if (dryRun) {
    for (const item of doc.items ?? []) {
      rows.push({ slug: item.slug, status: "created", errors: [] });
      created += 1;
    }
    return {
      dryRun: true,
      contentTypeSlug: doc.contentType.slug,
      aggregate: {
        created,
        updated: 0,
        skipped: 0,
        error: 0,
        total: doc.items?.length ?? 0,
      },
      rows,
    };
  }

  const type = await prisma.$transaction(async (tx) => {
    const existing = await tx.contentType.findUnique({ where: { slug: doc.contentType.slug } });
    const typeData = {
      slug: doc.contentType.slug,
      icon: doc.contentType.icon ?? "box",
      routePrefix: doc.contentType.routePrefix,
      isEnabled: doc.contentType.isEnabled ?? true,
      sortOrder: doc.contentType.sortOrder ?? 0,
      fieldSchema: fieldSchema as object,
      displaySchema: parseRecord(doc.contentType.displaySchema) as object,
      adminConfig: adminConfig as object,
    };

    if (existing) {
      return tx.contentType.update({ where: { id: existing.id }, data: typeData });
    }
    return tx.contentType.create({ data: typeData });
  });

  await upsertTypeTranslations(type.id, doc.contentType.translations ?? {});

  for (const item of doc.items ?? []) {
    try {
      const existing = await prisma.contentItem.findFirst({
        where: { contentTypeId: type.id, slug: item.slug, deletedAt: null },
      });

      if (existing && duplicatePolicy === "skip") {
        rows.push({ slug: item.slug, status: "skipped", errors: [] });
        skipped += 1;
        continue;
      }

      const data = {
        contentTypeId: type.id,
        slug: item.slug,
        status: item.status ?? "DRAFT",
        isFeatured: item.isFeatured ?? false,
        isVisible: item.isVisible ?? true,
        sortOrder: item.sortOrder ?? 0,
        attributes: parseRecord(item.attributes) as object,
        blocks: (item.blocks ?? []) as object,
        displaySettings: parseRecord(item.displaySettings) as object,
      };

      const saved = existing
        ? await prisma.contentItem.update({ where: { id: existing.id }, data })
        : await prisma.contentItem.create({ data });

      await upsertItemTranslations(saved.id, item.translations ?? []);
      await searchIndexer.indexContentItem({
        id: saved.id,
        slug: saved.slug,
        attributes: saved.attributes,
        metadata: saved.metadata,
        blocks: saved.blocks,
        status: saved.status,
        isVisible: saved.isVisible,
        contentType: {
          slug: type.slug,
          routePrefix: type.routePrefix,
          fieldSchema: type.fieldSchema,
          adminConfig: type.adminConfig,
          isEnabled: type.isEnabled,
        },
        collection: null,
      });

      if (existing) {
        rows.push({ slug: item.slug, status: "updated", errors: [] });
        updated += 1;
      } else {
        rows.push({ slug: item.slug, status: "created", errors: [] });
        created += 1;
      }
    } catch (e) {
      rows.push({
        slug: item.slug,
        status: "error",
        errors: [e instanceof Error ? e.message : "Import failed"],
      });
      error += 1;
    }
  }

  await searchIndexer.reindexContentType(type.id);

  return {
    dryRun: false,
    contentTypeSlug: type.slug,
    contentTypeId: type.id,
    aggregate: {
      created,
      updated,
      skipped,
      error,
      total: doc.items?.length ?? 0,
    },
    rows,
  };
}
