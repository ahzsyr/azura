import type { TranslationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PublicLocale } from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import { localeService } from "@/features/i18n/locale.service";
import { resolveTranslation } from "./translation-resolver";
import { createCached, CACHE_TAGS, revalidateCompletion, revalidateTranslations, revalidateWorkspaceTranslations } from "@/services/cache";
import { translationJobService } from "@/capabilities/ai/jobs/translation-job.service";
import { versioningCapability } from "@/capabilities/versioning";
import { getEntityConfig, getRequiredFields, getTranslatableFields, listRegisteredEntityTypes, listPriorityFieldKeys } from "./entity-registry";
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
  EntityCompletionStats,
  TranslationCompletionStats,
} from "./types";
import type {
  EditableTranslationRow,
  ListEditableTranslationsQuery,
  ListEditableTranslationsResult,
  TranslationGridCell,
} from "./translation-grid-types";

function normalizeTranslationInput(input: EntityTranslationInput): EntityTranslationInput {
  return {
    ...input,
    entityType: input.entityType.trim(),
    entityId: input.entityId.trim(),
    field: input.field.trim(),
    localeCode: input.localeCode.trim().toLowerCase(),
    value: input.value,
  };
}

function translationCompositeKey(input: EntityTranslationInput): string {
  const n = normalizeTranslationInput(input);
  return `${n.entityType}|${n.entityId}|${n.field}|${n.localeCode}`;
}

function dedupeTranslationInputs(inputs: EntityTranslationInput[]): EntityTranslationInput[] {
  const map = new Map<string, EntityTranslationInput>();
  for (const input of inputs) {
    map.set(translationCompositeKey(input), normalizeTranslationInput(input));
  }
  return [...map.values()];
}

function getCachedForEntity(entityType: string, entityId: string, localeCode?: string) {
  const localeKey = localeCode ?? "_all";
  return createCached(
    () => {
      const where: { entityType: string; entityId: string; localeCode?: string } = {
        entityType,
        entityId,
      };
      if (localeCode) where.localeCode = localeCode;
      return prisma.entityTranslation.findMany({ where });
    },
    ["entity-translations", entityType, entityId, localeKey],
    {
      tags: [CACHE_TAGS.entityTranslations(entityType, entityId), CACHE_TAGS.translations],
    }
  )();
}

function completionFieldsForEntity(entityType: string) {
  const required = getRequiredFields(entityType);
  return required.length > 0 ? required : getTranslatableFields(entityType);
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await fn(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

export type ResolveFieldOptions = {
  includeUnpublished?: boolean;
  /** Used during workspace migration only; removed after Phase 3 backfill. */
  legacyFallback?: string;
};

export type EntityFieldRef = {
  entityType: string;
  entityId: string;
};

export const translationService = {
  async upsert(input: EntityTranslationInput) {
    const normalized = normalizeTranslationInput(input);
    const status: TranslationStatus = normalized.status ?? "PUBLISHED";
    const where = {
      entityType_entityId_field_localeCode: {
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        field: normalized.field,
        localeCode: normalized.localeCode,
      },
    };

    const existing = await prisma.entityTranslation.findUnique({ where });
    const valueChanged = existing !== null && existing.value !== normalized.value;

    let row;
    try {
      row = await prisma.entityTranslation.upsert({
        where,
        create: {
          entityType: normalized.entityType,
          entityId: normalized.entityId,
          field: normalized.field,
          localeCode: normalized.localeCode,
          value: normalized.value,
          status,
        },
        update: {
          value: normalized.value,
          status,
          ...(valueChanged ? { version: { increment: 1 } } : {}),
        },
      });
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code !== "P2002") throw error;
      row = await prisma.entityTranslation.update({
        where,
        data: {
          value: normalized.value,
          status,
          ...(valueChanged ? { version: { increment: 1 } } : {}),
        },
      });
    }

    if (valueChanged && existing) {
      await versioningCapability.onFieldWrite({
        translationId: row.id,
        value: existing.value,
        status: existing.status,
        changedBy: input.changedBy,
      });
    }

    revalidateTranslations(normalized.entityType, normalized.entityId);
    revalidateWorkspaceTranslations(normalized.entityType, [normalized.localeCode]);
    await this.syncLocaleCompletionPercent(normalized.localeCode);
    return row;
  },

  async deleteTranslation(
    input: Pick<EntityTranslationInput, "entityType" | "entityId" | "field" | "localeCode">
  ) {
    const deleted = await prisma.entityTranslation.deleteMany({
      where: {
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        localeCode: input.localeCode,
      },
    });
    if (deleted.count > 0) {
      revalidateTranslations(input.entityType, input.entityId);
      revalidateWorkspaceTranslations(input.entityType, [input.localeCode]);
      await this.syncLocaleCompletionPercent(input.localeCode);
    }
    return deleted.count;
  },

  async deleteMany(
    inputs: Array<
      Pick<EntityTranslationInput, "entityType" | "entityId" | "field" | "localeCode">
    >
  ) {
    const unique: Array<
      Pick<EntityTranslationInput, "entityType" | "entityId" | "field" | "localeCode">
    > = [];
    const seen = new Set<string>();
    for (const input of inputs) {
      const key = `${input.entityType}:${input.entityId}:${input.field}:${input.localeCode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(input);
    }
    if (unique.length === 0) return 0;

    const deleted = await prisma.entityTranslation.deleteMany({
      where: {
        OR: unique.map((input) => ({
          entityType: input.entityType,
          entityId: input.entityId,
          field: input.field,
          localeCode: input.localeCode,
        })),
      },
    });

    if (deleted.count > 0) {
      const entityKeys = new Set(unique.map((i) => `${i.entityType}\0${i.entityId}`));
      const localeCodes = new Set(unique.map((i) => i.localeCode));
      for (const key of entityKeys) {
        const sep = key.indexOf("\0");
        const entityType = key.slice(0, sep);
        const entityId = key.slice(sep + 1);
        revalidateTranslations(entityType, entityId);
        revalidateWorkspaceTranslations(entityType, [...localeCodes]);
      }
      for (const code of localeCodes) {
        await this.syncLocaleCompletionPercent(code);
      }
    }
    return deleted.count;
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
        status: "PUBLISHED",
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

    const enabled = locales.length > 0 ? locales : await localeService.listEnabled();
    const fromForm = parseBlockTranslationsJson(formTranslationsJson ?? null);
    const formTouchedKeys = new Set(
      fromForm.map(
        (input) =>
          `${input.entityId}|${input.field}|${input.localeCode.toLowerCase()}`
      )
    );
    const formOverrides = new Map(
      fromForm.map((i) => [buildTranslationOverrideKey(i.entityId, i.field, i.localeCode), i.value])
    );
    const fromPropsWithOverrides = extractTranslationsFromBlocks(
      blocks,
      parentType,
      parentId,
      enabled,
      formOverrides
    );
    const merged = mergeBlockTranslationInputs(fromPropsWithOverrides, fromForm);

    const currentIds = [...currentEntityIds];
    const preserved: EntityTranslationInput[] = [];
    if (currentIds.length > 0) {
      const existing = await prisma.entityTranslation.findMany({
        where: {
          entityType: BUILDER_BLOCK_ENTITY_TYPE,
          entityId: { in: currentIds },
        },
      });
      const mergedKeys = new Set(
        merged.map(
          (input) =>
            `${input.entityId}|${input.field}|${input.localeCode.toLowerCase()}`
        )
      );
      for (const row of existing) {
        const key = `${row.entityId}|${row.field}|${row.localeCode.toLowerCase()}`;
        if (formTouchedKeys.has(key) || mergedKeys.has(key)) continue;
        if (!row.value.trim()) continue;
        preserved.push({
          entityType: BUILDER_BLOCK_ENTITY_TYPE,
          entityId: row.entityId,
          field: row.field,
          localeCode: row.localeCode,
          value: row.value,
          status: row.status,
        });
      }
    }

    const finalMerged = dedupeTranslationInputs([...merged, ...preserved]);
    const nonEmpty = finalMerged.filter((i) => i.value.trim());
    const mergedKeys = new Set(
      nonEmpty.map(
        (i) => `${i.entityId}|${i.field}|${i.localeCode.toLowerCase()}`
      )
    );

    let staleDeleted = 0;
    if (currentIds.length > 0) {
      const existing = await prisma.entityTranslation.findMany({
        where: {
          entityType: BUILDER_BLOCK_ENTITY_TYPE,
          entityId: { in: currentIds },
        },
        select: { id: true, entityId: true, field: true, localeCode: true },
      });
      const staleIds = existing
        .filter(
          (row) =>
            !mergedKeys.has(`${row.entityId}|${row.field}|${row.localeCode.toLowerCase()}`)
        )
        .map((row) => row.id);
      if (staleIds.length > 0) {
        const deleted = await prisma.entityTranslation.deleteMany({
          where: { id: { in: staleIds } },
        });
        staleDeleted = deleted.count;
      }
    }

    if (nonEmpty.length > 0) {
      const inputs = dedupeTranslationInputs(nonEmpty);
      await prisma.$transaction(
        inputs.map((input) => {
          const normalized = normalizeTranslationInput(input);
          const status: TranslationStatus = normalized.status ?? "PUBLISHED";
          return prisma.entityTranslation.upsert({
            where: {
              entityType_entityId_field_localeCode: {
                entityType: normalized.entityType,
                entityId: normalized.entityId,
                field: normalized.field,
                localeCode: normalized.localeCode,
              },
            },
            create: {
              entityType: normalized.entityType,
              entityId: normalized.entityId,
              field: normalized.field,
              localeCode: normalized.localeCode,
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
    }

    if (nonEmpty.length > 0 || staleDeleted > 0) {
      revalidateTranslations(parentType, parentId);
      const localeCodes = new Set(nonEmpty.map((i) => i.localeCode));
      for (const code of localeCodes) {
        await this.syncLocaleCompletionPercent(code);
      }
    }
    return nonEmpty.length;
  },

  async getForEntity(entityType: string, entityId: string, localeCode?: string) {
    return getCachedForEntity(entityType, entityId, localeCode);
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
      map.get(row.field)![row.localeCode] = row.value;
    }
    return map;
  },

  async resolveField(
    entityType: string,
    entityId: string,
    field: string,
    localeCode: string,
    options: ResolveFieldOptions = {}
  ): Promise<string> {
    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";
    const rows = await this.getForEntity(entityType, entityId);
    const resolved = resolveTranslation(field, localeCode, {
      translations: rows,
      enabledLocales: enabled,
      defaultCode,
      includeUnpublished: options.includeUnpublished,
    });
    if (resolved.trim()) return resolved;
    return options.legacyFallback?.trim() ?? "";
  },

  async resolveFieldsBatch(
    refs: EntityFieldRef[],
    field: string,
    localeCode: string,
    options: ResolveFieldOptions = {}
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (refs.length === 0) return result;

    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";
    const byType = new Map<string, string[]>();
    for (const ref of refs) {
      const ids = byType.get(ref.entityType) ?? [];
      ids.push(ref.entityId);
      byType.set(ref.entityType, ids);
    }

    const rowsByEntity = new Map<string, Awaited<ReturnType<typeof this.getForEntity>>>();
    for (const [entityType, entityIds] of byType) {
      const map = await this.getForEntities(entityType, [...new Set(entityIds)]);
      for (const [id, rows] of map) {
        rowsByEntity.set(`${entityType}:${id}`, rows);
      }
    }

    for (const ref of refs) {
      const key = `${ref.entityType}:${ref.entityId}`;
      const rows = rowsByEntity.get(key) ?? [];
      const resolved = resolveTranslation(field, localeCode, {
        translations: rows,
        enabledLocales: enabled,
        defaultCode,
        includeUnpublished: options.includeUnpublished,
      });
      result.set(key, resolved.trim() ? resolved : (options.legacyFallback?.trim() ?? ""));
    }

    return result;
  },

  async bulkCopyFromSource(options: BulkCopyOptions) {
    const fields =
      options.fields ?? getTranslatableFields(options.entityType).map((f) => f.field);
    const sourceRows = await prisma.entityTranslation.findMany({
      where: {
        entityType: options.entityType,
        entityId: options.entityId,
        localeCode: options.sourceLocaleCode,
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
          localeCode: options.targetLocaleCode,
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
    localeCode: string,
    fallbackSlug?: string
  ): Promise<string> {
    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";

    const rows = await prisma.localizedSlug.findMany({
      where: { entityType, entityId },
    });

    const slugMap: Record<string, string> = {};
    for (const row of rows) {
      slugMap[row.localeCode.toLowerCase()] = row.slug;
    }

    for (const candidate of resolveLocaleCandidates(localeCode, enabled, defaultCode)) {
      if (slugMap[candidate]) return slugMap[candidate];
    }

    return fallbackSlug ?? "";
  },

  async upsertSlug(
    entityType: string,
    entityId: string,
    localeCode: string,
    slug: string
  ) {
    const normalizedLocaleCode = localeCode.trim().toLowerCase();
    const row = await prisma.localizedSlug.upsert({
      where: {
        entityType_entityId_localeCode: {
          entityType,
          entityId,
          localeCode: normalizedLocaleCode,
        },
      },
      create: { entityType, entityId, localeCode: normalizedLocaleCode, slug },
      update: { slug },
    });
    revalidateTranslations(entityType, entityId);
    return row;
  },

  async getCompletionStats(
    entityType: string,
    localeCode: string
  ): Promise<TranslationCompletionStats> {
    const fields = completionFieldsForEntity(entityType);
    if (fields.length === 0) {
      return { entityType, totalFields: 0, translatedFields: 0, percentage: 100, missingCount: 0 };
    }

    const entityIds = await this.listEntityIds(entityType);
    const fieldNames = fields.map((f) => f.field);
    const totalFields = entityIds.length * fields.length;

    if (totalFields === 0) {
      return { entityType, totalFields: 0, translatedFields: 0, percentage: 100, missingCount: 0 };
    }

    const translatedCount = await prisma.entityTranslation.count({
      where: {
        entityType,
        localeCode,
        field: { in: fieldNames },
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

  async getEntityCompletionStats(
    entityType: string,
    entityId: string,
    localeCodes: string[]
  ): Promise<EntityCompletionStats> {
    const fields = completionFieldsForEntity(entityType);
    const fieldNames = fields.map((f) => f.field);
    const rows = await prisma.entityTranslation.findMany({
      where: {
        entityType,
        entityId,
        localeCode: { in: localeCodes },
        field: { in: fieldNames },
        status: "PUBLISHED",
        value: { not: "" },
      },
    });

    const locales: EntityCompletionStats["locales"] = {};
    for (const code of localeCodes) {
      const translatedRequired = rows.filter((r) => r.localeCode === code).length;
      const totalRequired = fields.length;
      locales[code] = {
        totalRequired,
        translatedRequired,
        percentage:
          totalRequired > 0 ? Math.round((translatedRequired / totalRequired) * 100) : 100,
      };
    }

    return { entityType, entityId, locales };
  },

  async syncLocaleCompletionPercent(localeCode: string): Promise<number> {
    const percentage = await this.getOverallCompletionForLocale(localeCode);
    await prisma.localeConfig.updateMany({
      where: { code: localeCode },
      data: {
        completionPercent: percentage,
        lastTranslationSyncAt: new Date(),
      },
    });
    revalidateCompletion(localeCode);
    return percentage;
  },

  async restoreVersion(translationId: string, versionId: string) {
    const row = await versioningCapability.restoreVersion(translationId, versionId);
    await this.syncLocaleCompletionPercent(row.localeCode);
    return row;
  },

  async listTranslationVersions(translationId: string) {
    return versioningCapability.listVersions(translationId);
  },

  async findMissing(
    entityType: string,
    localeCode: string,
    limit = 50
  ): Promise<MissingTranslation[]> {
    const config = getEntityConfig(entityType);
    if (!config) return [];

    const defaultCode = (await localeService.listEnabled()).find((l) => l.isDefault)?.code ?? "en";
    const entityIds = await this.listEntityIds(entityType);
    const existing = await prisma.entityTranslation.findMany({
      where: { entityType, localeCode, status: "PUBLISHED" },
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
          localeCode,
          sourceValue: sourceValue || undefined,
        });

        if (missing.length >= limit) return missing;
      }
    }

    return missing;
  },

  async searchTranslations(
    query: string,
    options?: { entityType?: string; localeCode?: string; limit?: number }
  ) {
    const limit = options?.limit ?? 50;
    return prisma.entityTranslation.findMany({
      where: {
        ...(options?.entityType ? { entityType: options.entityType } : {}),
        ...(options?.localeCode ? { localeCode: options.localeCode } : {}),
        value: { contains: query },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
  },

  async listEditableTranslationRows(
    options: ListEditableTranslationsQuery
  ): Promise<ListEditableTranslationsResult> {
    const {
      entityType,
      localeCodes,
      defaultLocaleCode,
      search,
      statusFilter = "all",
      page = 1,
      pageSize = 50,
    } = options;

    const config = getEntityConfig(entityType);
    if (!config) {
      return { rows: [], total: 0, page, pageSize };
    }

    const entityIds = await this.listEntityIds(entityType);
    const fields = config.fields;
    const fieldCount = fields.length;
    const allLocales = [...new Set([defaultLocaleCode, ...localeCodes])];
    const nonDefaultLocales = localeCodes.filter(
      (c) => c.toLowerCase() !== defaultLocaleCode.toLowerCase()
    );

    type RowKey = { entityId: string; field: string; fieldLabel: string };

    const buildPageKeysFromIndex = (startIndex: number, count: number): RowKey[] => {
      const keys: RowKey[] = [];
      for (let i = startIndex; i < startIndex + count; i++) {
        const entityIndex = Math.floor(i / fieldCount);
        const fieldIndex = i % fieldCount;
        const entityId = entityIds[entityIndex];
        if (!entityId) continue;
        const fieldDef = fields[fieldIndex];
        keys.push({ entityId, field: fieldDef.field, fieldLabel: fieldDef.label });
      }
      return keys;
    };

    const needsFullScan = Boolean(search?.trim()) || statusFilter !== "all";

    if (!needsFullScan) {
      const total = entityIds.length * fieldCount;
      const start = (page - 1) * pageSize;
      const pageKeys = buildPageKeysFromIndex(start, Math.min(pageSize, Math.max(0, total - start)));

      const pageEntityIds = [...new Set(pageKeys.map((k) => k.entityId))];
      const translations =
        pageEntityIds.length === 0
          ? []
          : await prisma.entityTranslation.findMany({
              where: {
                entityType,
                entityId: { in: pageEntityIds },
                localeCode: { in: allLocales },
              },
            });

      const rows: EditableTranslationRow[] = pageKeys.map((rowKey) => {
        const cells: Record<string, TranslationGridCell> = {};
        for (const code of localeCodes) {
          const t = translations.find(
            (tr) =>
              tr.entityId === rowKey.entityId &&
              tr.field === rowKey.field &&
              tr.localeCode.toLowerCase() === code.toLowerCase()
          );
          cells[code] = {
            translationId: t?.id,
            value: t?.value ?? "",
            status: t?.status,
          };
        }
        const source = translations.find(
          (tr) =>
            tr.entityId === rowKey.entityId &&
            tr.field === rowKey.field &&
            tr.localeCode.toLowerCase() === defaultLocaleCode.toLowerCase()
        );
        return {
          entityType,
          entityId: rowKey.entityId,
          field: rowKey.field,
          fieldLabel: rowKey.fieldLabel,
          sourceValue: source?.value ?? "",
          cells,
        };
      });

      return { rows, total, page, pageSize };
    }

    let rowKeys: RowKey[] = [];
    for (const entityId of entityIds) {
      for (const fieldDef of fields) {
        rowKeys.push({ entityId, field: fieldDef.field, fieldLabel: fieldDef.label });
      }
    }

    let allTranslations: Awaited<ReturnType<typeof prisma.entityTranslation.findMany>> = [];
    if (entityIds.length > 0) {
      allTranslations = await prisma.entityTranslation.findMany({
        where: {
          entityType,
          entityId: { in: entityIds },
          localeCode: { in: allLocales },
        },
      });
    }

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      const matchingKeys = new Set<string>();
      for (const row of rowKeys) {
        const key = `${row.entityId}:${row.field}`;
        const relevant = allTranslations.filter(
          (t) => t.entityId === row.entityId && t.field === row.field
        );
        if (relevant.some((t) => t.value.toLowerCase().includes(q))) {
          matchingKeys.add(key);
        }
      }
      rowKeys = rowKeys.filter((r) => matchingKeys.has(`${r.entityId}:${r.field}`));
    }

    if (statusFilter !== "all") {
      rowKeys = rowKeys.filter((rowKey) => {
        const rowTranslations = allTranslations.filter(
          (tr) => tr.entityId === rowKey.entityId && tr.field === rowKey.field
        );

        if (statusFilter === "missing") {
          return nonDefaultLocales.some((code) => {
            const t = rowTranslations.find(
              (tr) =>
                tr.localeCode.toLowerCase() === code.toLowerCase() && tr.value.trim()
            );
            return !t;
          });
        }
        if (statusFilter === "draft") {
          return rowTranslations.some(
            (tr) =>
              localeCodes.some((c) => c.toLowerCase() === tr.localeCode.toLowerCase()) &&
              tr.status === "DRAFT"
          );
        }
        if (statusFilter === "published") {
          if (nonDefaultLocales.length === 0) return true;
          return nonDefaultLocales.every((code) => {
            const t = rowTranslations.find(
              (tr) =>
                tr.localeCode.toLowerCase() === code.toLowerCase() &&
                tr.status === "PUBLISHED" &&
                tr.value.trim()
            );
            return !!t;
          });
        }
        return true;
      });
    }

    const total = rowKeys.length;
    const start = (page - 1) * pageSize;
    const pageKeys = rowKeys.slice(start, start + pageSize);
    const pageEntityIds = [...new Set(pageKeys.map((k) => k.entityId))];

    const translations =
      pageEntityIds.length === 0
        ? []
        : await prisma.entityTranslation.findMany({
            where: {
              entityType,
              entityId: { in: pageEntityIds },
              localeCode: { in: allLocales },
            },
          });

    const rows: EditableTranslationRow[] = pageKeys.map((rowKey) => {
      const cells: Record<string, TranslationGridCell> = {};
      for (const code of localeCodes) {
        const t = translations.find(
          (tr) =>
            tr.entityId === rowKey.entityId &&
            tr.field === rowKey.field &&
            tr.localeCode.toLowerCase() === code.toLowerCase()
        );
        cells[code] = {
          translationId: t?.id,
          value: t?.value ?? "",
          status: t?.status,
        };
      }
      const source = translations.find(
        (tr) =>
          tr.entityId === rowKey.entityId &&
          tr.field === rowKey.field &&
          tr.localeCode.toLowerCase() === defaultLocaleCode.toLowerCase()
      );
      return {
        entityType,
        entityId: rowKey.entityId,
        field: rowKey.field,
        fieldLabel: rowKey.fieldLabel,
        sourceValue: source?.value ?? "",
        cells,
      };
    });

    return { rows, total, page, pageSize };
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
      case "BuilderBlock": {
        const ids: string[] = [];
        const [pages, posts, items] = await Promise.all([
          prisma.cmsPage.findMany({ select: { id: true, blocks: true } }),
          prisma.post.findMany({ select: { id: true, blocks: true } }),
          prisma.contentItem.findMany({ select: { id: true, blocks: true } }),
        ]);
        for (const page of pages) {
          ids.push(...collectBlockEntityIds(page.blocks as PageBlocks, "CmsPage", page.id));
        }
        for (const post of posts) {
          ids.push(...collectBlockEntityIds(post.blocks as PageBlocks, "Post", post.id));
        }
        for (const item of items) {
          ids.push(...collectBlockEntityIds(item.blocks as PageBlocks, "ContentItem", item.id));
        }
        return ids;
      }
      default:
        return [];
    }
  },

  async getCompletionMatrix(localeCodes: string[]) {
    const entityTypes = listRegisteredEntityTypes();
    const entityIdsByType = new Map<string, string[]>();

    const translationCounts =
      localeCodes.length === 0
        ? []
        : await prisma.entityTranslation.groupBy({
            by: ["entityType", "localeCode", "field"],
            where: {
              localeCode: { in: localeCodes },
              status: "PUBLISHED",
              value: { not: "" },
            },
            _count: { _all: true },
          });

    const translatedLookup = new Map<string, number>();
    for (const row of translationCounts) {
      translatedLookup.set(
        `${row.entityType}:${row.localeCode}:${row.field}`,
        row._count._all
      );
    }

    await runWithConcurrency(entityTypes, 6, async ({ type }) => {
      entityIdsByType.set(type, await this.listEntityIds(type));
    });

    return entityTypes.map(({ type, label }) => {
      const fields = completionFieldsForEntity(type);
      const locales: Record<string, TranslationCompletionStats> = {};
      const fieldNames = fields.map((f) => f.field);
      const entityIds = entityIdsByType.get(type) ?? [];
      const totalFields = entityIds.length * fields.length;

      for (const code of localeCodes) {
        if (fields.length === 0 || totalFields === 0) {
          locales[code] = {
            entityType: type,
            totalFields: 0,
            translatedFields: 0,
            percentage: 100,
            missingCount: 0,
          };
          continue;
        }

        let translatedCount = 0;
        for (const field of fieldNames) {
          translatedCount += translatedLookup.get(`${type}:${code}:${field}`) ?? 0;
        }
        const missingCount = Math.max(0, totalFields - translatedCount);
        const percentage = Math.round((translatedCount / totalFields) * 100);
        locales[code] = {
          entityType: type,
          totalFields,
          translatedFields: translatedCount,
          percentage,
          missingCount,
        };
      }

      return { entityType: type, label, locales };
    });
  },

  async getOverallCompletionForLocale(localeCode: string): Promise<number> {
    const entityTypes = listRegisteredEntityTypes();
    if (entityTypes.length === 0) return 100;

    const stats = await Promise.all(
      entityTypes.map(({ type }) => this.getCompletionStats(type, localeCode))
    );
    const withFields = stats.filter((s) => s.totalFields > 0);
    if (withFields.length === 0) return 100;

    return Math.round(
      withFields.reduce((sum, s) => sum + s.percentage, 0) / withFields.length
    );
  },

  async getOverallCompletionForLocaleSafe(localeCode: string): Promise<number> {
    try {
      return await this.getOverallCompletionForLocale(localeCode);
    } catch (error) {
      console.error(`Translation completion failed for locale ${localeCode}:`, error);
      return 0;
    }
  },

  async findPriorityMissing(limit = 30): Promise<MissingTranslation[]> {
    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";
    const nonDefault = enabled.filter((l) => !l.isDefault);
    if (nonDefault.length === 0) return [];

    const nonDefaultCodes = nonDefault.map((l) => l.code);
    const priorityByType = new Map<string, string[]>();
    for (const { entityType, field } of listPriorityFieldKeys()) {
      const fields = priorityByType.get(entityType) ?? [];
      if (!fields.includes(field)) fields.push(field);
      priorityByType.set(entityType, fields);
    }

    const perTypeMissing = await Promise.all(
      [...priorityByType.entries()].map(async ([entityType, fields]) => {
        const entityIds = await this.listEntityIds(entityType);
        if (entityIds.length === 0) return [] as MissingTranslation[];

        const [existing, sources] = await Promise.all([
          prisma.entityTranslation.findMany({
            where: {
              entityType,
              field: { in: fields },
              localeCode: { in: nonDefaultCodes },
              status: "PUBLISHED",
              value: { not: "" },
            },
            select: { entityId: true, field: true, localeCode: true },
          }),
          prisma.entityTranslation.findMany({
            where: {
              entityType,
              entityId: { in: entityIds },
              field: { in: fields },
              localeCode: defaultCode,
              status: "PUBLISHED",
              value: { not: "" },
            },
            select: { entityId: true, field: true, value: true },
          }),
        ]);

        const covered = new Set(
          existing.map((row) => `${row.entityId}:${row.field}:${row.localeCode}`)
        );
        const sourceByKey = new Map(
          sources.map((row) => [`${row.entityId}:${row.field}`, row.value])
        );

        const missing: MissingTranslation[] = [];
        for (const field of fields) {
          for (const entityId of entityIds) {
            const sourceValue = sourceByKey.get(`${entityId}:${field}`) ?? "";
            if (!sourceValue.trim()) continue;

            for (const locale of nonDefault) {
              if (covered.has(`${entityId}:${field}:${locale.code}`)) continue;
              missing.push({
                entityType,
                entityId,
                field,
                localeCode: locale.code,
                sourceValue,
              });
            }
          }
        }
        return missing;
      })
    );

    return perTypeMissing.flat().slice(0, limit);
  },

  async scaffoldLocaleFromEnglish(targetLocaleCode: string, jobId?: string) {
    const scaffoldStartedAt = Date.now();
    const enabled = await localeService.listEnabled();
    const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";
    if (targetLocaleCode.toLowerCase() === defaultCode.toLowerCase()) {
      return 0;
    }

    const sourceRows = await prisma.entityTranslation.findMany({
      where: {
        localeCode: defaultCode,
        value: { not: "" },
      },
    });

    if (jobId) {
      await translationJobService.markRunning(jobId, sourceRows.length);
    }

    const inputs: EntityTranslationInput[] = [];
    const loopStartedAt = Date.now();

    for (const row of sourceRows) {
      const existing = await prisma.entityTranslation.findUnique({
        where: {
          entityType_entityId_field_localeCode: {
            entityType: row.entityType,
            entityId: row.entityId,
            field: row.field,
            localeCode: targetLocaleCode,
          },
        },
      });
      if (existing?.value.trim()) continue;

      inputs.push({
        entityType: row.entityType,
        entityId: row.entityId,
        field: row.field,
        localeCode: targetLocaleCode,
        value: row.value,
        status: "DRAFT",
      });
    }

    const loopMs = Date.now() - loopStartedAt;
    const upsertStartedAt = Date.now();
    if (inputs.length > 0) {
      await this.upsertMany(inputs);
    }
    const upsertMs = Date.now() - upsertStartedAt;

    if (jobId) {
      await translationJobService.markProgress(jobId, inputs.length);
    }


    return inputs.length;
  },

  async exportEntityTranslationsCsv(localeCode: string): Promise<string> {
    const rows = await prisma.entityTranslation.findMany({
      where: { localeCode },
      orderBy: [{ entityType: "asc" }, { entityId: "asc" }, { field: "asc" }],
    });

    const header = "entityType,entityId,field,localeCode,value,status";
    const lines = rows.map((r) => {
      const escaped = `"${r.value.replace(/"/g, '""')}"`;
      return `${r.entityType},${r.entityId},${r.field},${r.localeCode},${escaped},${r.status}`;
    });

    return [header, ...lines].join("\n");
  },
};

export async function getCachedEntityTranslations(entityType: string, entityId: string) {
  return getCachedForEntity(entityType, entityId);
}
