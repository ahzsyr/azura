import type { TranslationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import { localeService } from "@/features/i18n/locale.service";
import { revalidateTranslations } from "@/services/cache";
import { readLegacyFieldWithFallback } from "./legacy-adapter";
import { translationJobService } from "./translation-job.service";
import { getEntityConfig, getTranslatableFields, listRegisteredEntityTypes, listPriorityFieldKeys } from "./entity-registry";
import {
  BUILDER_BLOCK_ENTITY_TYPE,
  collectBlockEntityIds,
  extractTranslationsFromBlocks,
  buildTranslationOverrideKey,
  mergeBlockTranslationInputs,
  parseBlockTranslationsJson,
  type BlockParentType,
} from "./block-translation";
import type { PageBlocks } from "@/types/builder";
import type {
  BulkCopyOptions,
  EntityTranslationInput,
  LocalizedValueMap,
  MissingTranslation,
  TranslationCompletionStats,
} from "./types";

function normalizeTranslationInput(input: EntityTranslationInput): EntityTranslationInput {
  return {
    ...input,
    entityType: input.entityType.trim(),
    entityId: input.entityId.trim(),
    field: input.field.trim(),
    languageCode: input.languageCode.trim().toLowerCase(),
    value: input.value,
  };
}

function translationCompositeKey(input: EntityTranslationInput): string {
  const n = normalizeTranslationInput(input);
  return `${n.entityType}|${n.entityId}|${n.field}|${n.languageCode}`;
}

function dedupeTranslationInputs(inputs: EntityTranslationInput[]): EntityTranslationInput[] {
  const map = new Map<string, EntityTranslationInput>();
  for (const input of inputs) {
    map.set(translationCompositeKey(input), normalizeTranslationInput(input));
  }
  return [...map.values()];
}

export const translationService = {
  async upsert(input: EntityTranslationInput) {
    const normalized = normalizeTranslationInput(input);
    const status: TranslationStatus = normalized.status ?? "PUBLISHED";
    const where = {
      entityType_entityId_field_languageCode: {
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        field: normalized.field,
        languageCode: normalized.languageCode,
      },
    };

    const existing = await prisma.entityTranslation.findUnique({ where });

    let row;
    try {
      row = await prisma.entityTranslation.upsert({
        where,
        create: {
          entityType: normalized.entityType,
          entityId: normalized.entityId,
          field: normalized.field,
          languageCode: normalized.languageCode,
          value: normalized.value,
          status,
        },
        update: {
          value: normalized.value,
          status,
        },
      });
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code !== "P2002") throw error;
      row = await prisma.entityTranslation.update({
        where,
        data: { value: normalized.value, status },
      });
    }

    if (existing && existing.value !== input.value) {
      await prisma.entityTranslationVersion.create({
        data: {
          translationId: row.id,
          value: existing.value,
          status: existing.status,
          changedBy: input.changedBy,
        },
      });
    }

    revalidateTranslations(normalized.entityType, normalized.entityId);
    return row;
  },

  async upsertMany(inputs: EntityTranslationInput[]) {
    const results = [];
    for (const input of dedupeTranslationInputs(inputs)) {
      results.push(await this.upsert(input));
    }
    return results;
  },

  async getForBlockEntityIds(entityIds: string[]) {
    if (entityIds.length === 0) return [];
    return prisma.entityTranslation.findMany({
      where: {
        entityType: BUILDER_BLOCK_ENTITY_TYPE,
        entityId: { in: entityIds },
      },
    });
  },

  async syncBlockTranslations(
    parentType: BlockParentType,
    parentId: string,
    blocks: PageBlocks,
    locales: PublicLocale[],
    formTranslationsJson?: string | null,
    previousBlocks?: PageBlocks
  ) {
    const currentEntityIds = new Set(collectBlockEntityIds(blocks, parentType, parentId));
    const previousEntityIds = previousBlocks
      ? collectBlockEntityIds(previousBlocks, parentType, parentId)
      : [];
    const orphanIds = previousEntityIds.filter((id) => !currentEntityIds.has(id));

    if (orphanIds.length > 0) {
      await prisma.entityTranslation.deleteMany({
        where: {
          entityType: BUILDER_BLOCK_ENTITY_TYPE,
          entityId: { in: orphanIds },
        },
      });
    }

    await prisma.entityTranslation.deleteMany({
      where: {
        entityType: BUILDER_BLOCK_ENTITY_TYPE,
        entityId: { startsWith: `${parentType}:${parentId}:` },
      },
    });

    const enabled = locales.length > 0 ? locales : await localeService.listEnabled();
    const fromForm = parseBlockTranslationsJson(formTranslationsJson ?? null);
    const formOverrides = new Map(
      fromForm.map((i) => [buildTranslationOverrideKey(i.entityId, i.field, i.languageCode), i.value])
    );
    const fromPropsWithOverrides = extractTranslationsFromBlocks(
      blocks,
      parentType,
      parentId,
      enabled,
      formOverrides
    );
    const merged = mergeBlockTranslationInputs(fromPropsWithOverrides, fromForm);
    const nonEmpty = merged.filter((i) => i.value.trim());

    if (nonEmpty.length > 0) {
      const inputs = dedupeTranslationInputs(nonEmpty);
      await prisma.$transaction(
        inputs.map((input) => {
          const normalized = normalizeTranslationInput(input);
          const status: TranslationStatus = normalized.status ?? "PUBLISHED";
          return prisma.entityTranslation.upsert({
            where: {
              entityType_entityId_field_languageCode: {
                entityType: normalized.entityType,
                entityId: normalized.entityId,
                field: normalized.field,
                languageCode: normalized.languageCode,
              },
            },
            create: {
              entityType: normalized.entityType,
              entityId: normalized.entityId,
              field: normalized.field,
              languageCode: normalized.languageCode,
              value: normalized.value,
              status,
            },
            update: {
              value: normalized.value,
              status,
            },
          });
        })
      );
      const entityIds = new Set(inputs.map((i) => i.entityId));
      for (const entityId of entityIds) {
        revalidateTranslations(BUILDER_BLOCK_ENTITY_TYPE, entityId);
      }
    }
    return nonEmpty.length;
  },

  async getForEntity(entityType: string, entityId: string, languageCode?: string) {
    const where: { entityType: string; entityId: string; languageCode?: string } = {
      entityType,
      entityId,
    };
    if (languageCode) where.languageCode = languageCode;
    return prisma.entityTranslation.findMany({ where });
  },

  async getForEntities(entityType: string, entityIds: string[]) {
    const map = new Map<string, Awaited<ReturnType<typeof this.getForEntity>>>();
    if (entityIds.length === 0) return map;

    const rows = await prisma.entityTranslation.findMany({
      where: { entityType, entityId: { in: entityIds } },
    });

    for (const id of entityIds) {
      map.set(id, []);
    }
    for (const row of rows) {
      const list = map.get(row.entityId);
      if (list) list.push(row);
    }
    return map;
  },

  async getFieldMap(entityType: string, entityId: string): Promise<Map<string, LocalizedValueMap>> {
    const rows = await this.getForEntity(entityType, entityId);
    const map = new Map<string, LocalizedValueMap>();
    for (const row of rows) {
      if (!map.has(row.field)) map.set(row.field, {});
      map.get(row.field)![row.languageCode] = row.value;
    }
    return map;
  },

  async resolveField(
    entityType: string,
    entityId: string,
    field: string,
    languageCode: string,
    legacyEntity?: Record<string, unknown>
  ): Promise<string> {
    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";

    const rows = await prisma.entityTranslation.findMany({
      where: { entityType, entityId, field },
    });

    const dbMap: Record<string, string> = {};
    for (const row of rows) {
      if (row.status === "PUBLISHED" && row.value.trim()) {
        dbMap[row.languageCode.toLowerCase()] = row.value;
      }
    }

    for (const candidate of resolveLocaleCandidates(languageCode, enabled, defaultCode)) {
      if (dbMap[candidate]) return dbMap[candidate];
    }

    if (legacyEntity) {
      return resolveLegacyColumn(legacyEntity, field, languageCode, enabled, defaultCode);
    }

    return "";
  },

  async bulkCopyFromSource(options: BulkCopyOptions) {
    const fields =
      options.fields ?? getTranslatableFields(options.entityType).map((f) => f.field);
    const sourceRows = await prisma.entityTranslation.findMany({
      where: {
        entityType: options.entityType,
        entityId: options.entityId,
        languageCode: options.sourceLanguageCode,
        field: { in: fields },
      },
    });

    const inputs: EntityTranslationInput[] = [];

    for (const field of fields) {
      const source = sourceRows.find((r) => r.field === field);
      if (source?.value) {
        inputs.push({
          entityType: options.entityType,
          entityId: options.entityId,
          field,
          languageCode: options.targetLanguageCode,
          value: source.value,
          status: options.status ?? "DRAFT",
        });
      }
    }

    return this.upsertMany(inputs);
  },

  async getLocalizedSlug(
    entityType: string,
    entityId: string,
    languageCode: string,
    fallbackSlug?: string
  ): Promise<string> {
    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";

    const rows = await prisma.localizedSlug.findMany({
      where: { entityType, entityId },
    });

    const slugMap: Record<string, string> = {};
    for (const row of rows) {
      slugMap[row.languageCode.toLowerCase()] = row.slug;
    }

    for (const candidate of resolveLocaleCandidates(languageCode, enabled, defaultCode)) {
      if (slugMap[candidate]) return slugMap[candidate];
    }

    return fallbackSlug ?? "";
  },

  async upsertSlug(
    entityType: string,
    entityId: string,
    languageCode: string,
    slug: string
  ) {
    const row = await prisma.localizedSlug.upsert({
      where: {
        entityType_entityId_languageCode: { entityType, entityId, languageCode },
      },
      create: { entityType, entityId, languageCode, slug },
      update: { slug },
    });
    revalidateTranslations(entityType, entityId);
    return row;
  },

  async getCompletionStats(
    entityType: string,
    languageCode: string
  ): Promise<TranslationCompletionStats> {
    const fields = getTranslatableFields(entityType);
    if (fields.length === 0) {
      return { entityType, totalFields: 0, translatedFields: 0, percentage: 100, missingCount: 0 };
    }

    const entityIds = await this.listEntityIds(entityType);
    const totalFields = entityIds.length * fields.length;

    if (totalFields === 0) {
      return { entityType, totalFields: 0, translatedFields: 0, percentage: 100, missingCount: 0 };
    }

    const translatedCount = await prisma.entityTranslation.count({
      where: {
        entityType,
        languageCode,
        status: "PUBLISHED",
        value: { not: "" },
      },
    });

    const missingCount = Math.max(0, totalFields - translatedCount);
    const percentage = Math.round((translatedCount / totalFields) * 100);

    return {
      entityType,
      totalFields,
      translatedFields: translatedCount,
      percentage,
      missingCount,
    };
  },

  async findMissing(
    entityType: string,
    languageCode: string,
    limit = 50
  ): Promise<MissingTranslation[]> {
    const config = getEntityConfig(entityType);
    if (!config) return [];

    const defaultCode = (await localeService.listEnabled()).find((l) => l.isDefault)?.code ?? "en";
    const entityIds = await this.listEntityIds(entityType);
    const existing = await prisma.entityTranslation.findMany({
      where: { entityType, languageCode, status: "PUBLISHED" },
    });
    const existingSet = new Set(existing.map((r) => `${r.entityId}:${r.field}`));

    const missing: MissingTranslation[] = [];

    for (const entityId of entityIds) {
      for (const fieldDef of config.fields) {
        const key = `${entityId}:${fieldDef.field}`;
        if (existingSet.has(key)) continue;

        const sourceValue = await this.resolveField(
          entityType,
          entityId,
          fieldDef.field,
          defaultCode
        );

        missing.push({
          entityType,
          entityId,
          field: fieldDef.field,
          languageCode,
          sourceValue: sourceValue || undefined,
        });

        if (missing.length >= limit) return missing;
      }
    }

    return missing;
  },

  async searchTranslations(
    query: string,
    options?: { entityType?: string; languageCode?: string; limit?: number }
  ) {
    const limit = options?.limit ?? 50;
    return prisma.entityTranslation.findMany({
      where: {
        ...(options?.entityType ? { entityType: options.entityType } : {}),
        ...(options?.languageCode ? { languageCode: options.languageCode } : {}),
        value: { contains: query },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
  },

  async listEntityIds(entityType: string): Promise<string[]> {
    switch (entityType) {
      case "ContentItem":
        return (await prisma.contentItem.findMany({ select: { id: true } })).map((r) => r.id);
      case "ContentCollection":
        return (await prisma.contentCollection.findMany({ select: { id: true } })).map((r) => r.id);
      case "ContentType":
        return (await prisma.contentType.findMany({ select: { id: true } })).map((r) => r.id);
      case "CmsPage":
        return (await prisma.cmsPage.findMany({ select: { id: true } })).map((r) => r.id);
      case "Post":
        return (await prisma.post.findMany({ select: { id: true } })).map((r) => r.id);
      case "PostCategory":
        return (await prisma.postCategory.findMany({ select: { id: true } })).map((r) => r.id);
      case "PostTag":
        return (await prisma.postTag.findMany({ select: { id: true } })).map((r) => r.id);
      case "PostAuthor":
        return (await prisma.postAuthor.findMany({ select: { id: true } })).map((r) => r.id);
      case "Gallery":
        return (await prisma.gallery.findMany({ select: { id: true } })).map((r) => r.id);
      case "GalleryMedia":
        return (await prisma.galleryMedia.findMany({ select: { id: true } })).map((r) => r.id);
      case "Testimonial":
        return (await prisma.testimonial.findMany({ select: { id: true } })).map((r) => r.id);
      case "TestimonialCollection":
        return (await prisma.testimonialCollection.findMany({ select: { id: true } })).map((r) => r.id);
      case "FaqSet":
        return (await prisma.faqSet.findMany({ select: { id: true } })).map((r) => r.id);
      case "FaqItem":
        return (await prisma.faqItem.findMany({ select: { id: true } })).map((r) => r.id);
      case "CompanyInfo":
        return ["default"];
      case "SeoMeta":
        return (await prisma.seoMeta.findMany({ select: { id: true } })).map((r) => r.id);
      case "SeoSettings":
        return (await prisma.seoSettings.findMany({ select: { id: true } })).map((r) => r.id);
      case "BuilderBlock": {
        const ids: string[] = [];
        const [pages, posts, items] = await Promise.all([
          prisma.cmsPage.findMany({ select: { id: true, blocks: true } }),
          prisma.post.findMany({ select: { id: true, blocks: true } }),
          prisma.contentItem.findMany({ select: { id: true, blocks: true } }),
        ]);
        for (const page of pages) {
          const blocks = (page.blocks as PageBlocks) ?? [];
          ids.push(...collectBlockEntityIds(blocks, "CmsPage", page.id));
        }
        for (const post of posts) {
          const blocks = (post.blocks as PageBlocks) ?? [];
          ids.push(...collectBlockEntityIds(blocks, "Post", post.id));
        }
        for (const item of items) {
          const blocks = (item.blocks as PageBlocks) ?? [];
          ids.push(...collectBlockEntityIds(blocks, "ContentItem", item.id));
        }
        return ids;
      }
      default:
        return [];
    }
  },

  async getCompletionMatrix(languageCodes: string[]) {
    const entityTypes = listRegisteredEntityTypes();
    const matrix: {
      entityType: string;
      label: string;
      locales: Record<string, TranslationCompletionStats>;
    }[] = [];

    for (const { type, label } of entityTypes) {
      const locales: Record<string, TranslationCompletionStats> = {};
      for (const code of languageCodes) {
        locales[code] = await this.getCompletionStats(type, code);
      }
      matrix.push({ entityType: type, label, locales });
    }

    return matrix;
  },

  async getOverallCompletionForLocale(languageCode: string): Promise<number> {
    const entityTypes = listRegisteredEntityTypes();
    if (entityTypes.length === 0) return 100;

    const stats = await Promise.all(
      entityTypes.map(({ type }) => this.getCompletionStats(type, languageCode))
    );
    const withFields = stats.filter((s) => s.totalFields > 0);
    if (withFields.length === 0) return 100;

    return Math.round(
      withFields.reduce((sum, s) => sum + s.percentage, 0) / withFields.length
    );
  },

  async findPriorityMissing(limit = 30): Promise<MissingTranslation[]> {
    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";
    const nonDefault = enabled.filter((l) => !l.isDefault);
    const priorityKeys = listPriorityFieldKeys();
    const missing: MissingTranslation[] = [];

    for (const { entityType, field } of priorityKeys) {
      const entityIds = await this.listEntityIds(entityType);
      if (entityIds.length === 0) continue;

      const existing = await prisma.entityTranslation.findMany({
        where: {
          entityType,
          field,
          languageCode: { in: nonDefault.map((l) => l.code) },
          status: "PUBLISHED",
          value: { not: "" },
        },
      });

      const covered = new Set(existing.map((r) => `${r.entityId}:${r.languageCode}`));

      for (const entityId of entityIds) {
        for (const locale of nonDefault) {
          if (covered.has(`${entityId}:${locale.code}`)) continue;

          const sourceValue = await this.resolveField(entityType, entityId, field, defaultCode);
          if (!sourceValue.trim()) continue;

          missing.push({
            entityType,
            entityId,
            field,
            languageCode: locale.code,
            sourceValue,
          });

          if (missing.length >= limit) return missing;
        }
      }
    }

    return missing;
  },

  async scaffoldLocaleFromEnglish(targetLanguageCode: string, jobId?: string) {
    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";
    if (targetLanguageCode.toLowerCase() === defaultCode.toLowerCase()) {
      return 0;
    }

    const sourceRows = await prisma.entityTranslation.findMany({
      where: {
        languageCode: defaultCode,
        value: { not: "" },
      },
    });

    if (jobId) {
      await translationJobService.markRunning(jobId, sourceRows.length);
    }

    const inputs: EntityTranslationInput[] = [];

    for (const row of sourceRows) {
      const existing = await prisma.entityTranslation.findUnique({
        where: {
          entityType_entityId_field_languageCode: {
            entityType: row.entityType,
            entityId: row.entityId,
            field: row.field,
            languageCode: targetLanguageCode,
          },
        },
      });
      if (existing?.value.trim()) continue;

      inputs.push({
        entityType: row.entityType,
        entityId: row.entityId,
        field: row.field,
        languageCode: targetLanguageCode,
        value: row.value,
        status: "DRAFT",
      });
    }

    if (inputs.length > 0) {
      await this.upsertMany(inputs);
    }

    if (jobId) {
      await translationJobService.markProgress(jobId, inputs.length);
    }

    return inputs.length;
  },

  async exportEntityTranslationsCsv(languageCode: string): Promise<string> {
    const rows = await prisma.entityTranslation.findMany({
      where: { languageCode },
      orderBy: [{ entityType: "asc" }, { entityId: "asc" }, { field: "asc" }],
    });

    const header = "entityType,entityId,field,languageCode,value,status";
    const lines = rows.map((r) => {
      const escaped = `"${r.value.replace(/"/g, '""')}"`;
      return `${r.entityType},${r.entityId},${r.field},${r.languageCode},${escaped},${r.status}`;
    });

    return [header, ...lines].join("\n");
  },
};

function resolveLegacyColumn(
  entity: Record<string, unknown>,
  field: string,
  languageCode: string,
  enabled: PublicLocale[],
  defaultCode: string
): string {
  return readLegacyFieldWithFallback(entity, field, languageCode, enabled, defaultCode);
}

export async function getCachedEntityTranslations(entityType: string, entityId: string) {
  return prisma.entityTranslation.findMany({
    where: { entityType, entityId, status: "PUBLISHED" },
  });
}
