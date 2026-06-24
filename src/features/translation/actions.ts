"use server";

import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/features/auth/guards";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { aiCapability, translationJobService } from "@/capabilities/ai";
import type { EntityTranslationInput } from "@/features/translation/types";
import type { TranslationStatus } from "@prisma/client";
import {
  parseTranslationsCsv,
  parseTranslationsJson,
  rowsToCsv,
} from "@/features/translation/import-parser";
import type {
  BulkSaveCellInput,
  BulkSaveResult,
  ListEditableTranslationsQuery,
} from "@/features/translation/translation-grid-types";
import { getEntityConfig } from "@/features/translation/entity-registry";

export async function upsertTranslationAction(input: EntityTranslationInput) {
  await requireAdmin();
  const row = await translationService.upsert(input);
  revalidatePath("/admin/translations");
  return { success: true, id: row.id };
}

/** Alias used by universal translation editor */
export const upsertTranslation = upsertTranslationAction;

export async function upsertTranslationsAction(inputs: EntityTranslationInput[]) {
  await requireAdmin();
  if (inputs.length === 0) {
    return { success: true, upsertedCount: 0, verifiedCount: 0 };
  }
  await translationService.upsertMany(inputs);
  const uniqueRefs = [
    ...new Map(inputs.map((input) => [`${input.entityType}:${input.entityId}`, input])).values(),
  ];
  const rowsByRef = await Promise.all(
    uniqueRefs.map((ref) => translationService.getForEntity(ref.entityType, ref.entityId)),
  );
  const allRows = rowsByRef.flat();
  const verifiedCount = inputs.filter((input) =>
    allRows.some(
      (row) =>
        row.entityType === input.entityType &&
        row.entityId === input.entityId &&
        row.field === input.field &&
        row.localeCode.toLowerCase() === input.localeCode.toLowerCase() &&
        row.value === input.value,
    ),
  ).length;
  revalidatePath("/admin/translations");
  return { success: true, upsertedCount: inputs.length, verifiedCount };
}

export async function bulkCopyTranslationsAction(
  entityType: string,
  entityId: string,
  sourceLocaleCode: string,
  targetLocaleCode: string,
  status: TranslationStatus = "DRAFT"
) {
  await requireAdmin();
  const rows = await translationService.bulkCopyFromSource({
    entityType,
    entityId,
    sourceLocaleCode,
    targetLocaleCode,
    status,
  });
  revalidatePath("/admin/translations");
  return { success: true, count: rows.length };
}

export async function searchTranslationsAction(
  query: string,
  entityType?: string,
  localeCode?: string
) {
  await requireAdmin();
  return translationService.searchTranslations(query, { entityType, localeCode });
}

export async function upsertLocalizedSlugAction(
  entityType: string,
  entityId: string,
  localeCode: string,
  slug: string
) {
  await requireAdmin();
  await translationService.upsertSlug(entityType, entityId, localeCode, slug);
  return { success: true };
}

export async function getEntityTranslationsAction(entityType: string, entityId: string) {
  await requireAdmin();
  return translationService.getForEntity(entityType, entityId);
}

export async function getWorkspaceTranslationsBulkAction(
  refs: { entityType: string; entityId: string }[],
) {
  await requireAdmin();
  if (refs.length === 0) return [];
  const unique = [...new Map(refs.map((r) => [`${r.entityType}:${r.entityId}`, r])).values()];
  const { prisma } = await import("@/lib/prisma");
  return prisma.entityTranslation.findMany({
    where: {
      OR: unique.map((r) => ({ entityType: r.entityType, entityId: r.entityId })),
    },
  });
}

export async function getCompletionMatrixAction() {
  await requireAdmin();
  const enabled = await localeService.listEnabled();
  const nonDefault = enabled.filter((l) => !l.isDefault);
  return translationService.getCompletionMatrix(nonDefault.map((l) => l.code));
}

export async function findMissingForCellAction(
  entityType: string,
  localeCode: string,
  limit = 100
) {
  await requireAdmin();
  return translationService.findMissing(entityType, localeCode, limit);
}

export async function findPriorityMissingAction(limit = 30) {
  await requireAdmin();
  return translationService.findPriorityMissing(limit);
}

export async function scaffoldLocaleTranslationsAction(targetLocaleCode: string) {
  await requireAdmin();
  const job = await aiCapability.queueTranslationJob(targetLocaleCode);
  try {
    const count = await translationService.scaffoldLocaleFromEnglish(targetLocaleCode, job.id);
    await translationJobService.completeJob(job.id, "COMPLETED");
    revalidatePath("/admin/languages");
    revalidatePath("/admin/translations");
    return { success: true, count, jobId: job.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scaffold failed";
    await translationJobService.completeJob(job.id, "FAILED", message);
    throw error;
  }
}

export async function getLocaleCompletionAction(localeCode: string) {
  await requireAdmin();
  const percentage = await translationService.getOverallCompletionForLocale(localeCode);
  return { percentage };
}

export async function bulkUpsertTranslationsAction(inputs: EntityTranslationInput[]) {
  await requireAdmin();
  if (inputs.length === 0) {
    return { success: true, upsertedCount: 0, verifiedCount: 0 };
  }
  await translationService.upsertMany(inputs);
  const uniqueRefs = [
    ...new Map(inputs.map((input) => [`${input.entityType}:${input.entityId}`, input])).values(),
  ];
  const rowsByRef = await Promise.all(
    uniqueRefs.map((ref) => translationService.getForEntity(ref.entityType, ref.entityId)),
  );
  const allRows = rowsByRef.flat();
  const verifiedCount = inputs.filter((input) =>
    allRows.some(
      (row) =>
        row.entityType === input.entityType &&
        row.entityId === input.entityId &&
        row.field === input.field &&
        row.localeCode.toLowerCase() === input.localeCode.toLowerCase() &&
        row.value === input.value,
    ),
  ).length;
  revalidatePath("/admin/translations");
  return { success: true, upsertedCount: inputs.length, verifiedCount };
}

export async function exportMergedMessagesAction(localeCode: string) {
  await requireAdmin();
  const filePath = path.join(process.cwd(), "messages", `${localeCode}.json`);
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "{}";
  }
}

export async function exportLocaleBundleAction(localeCode: string) {
  await requireAdmin();
  const messagesJson = await exportMergedMessagesAction(localeCode);
  const csv = await translationService.exportEntityTranslationsCsv(localeCode);
  return { messagesJson, csv, localeCode };
}

export async function getEntityFieldCompletionAction(
  entityType: string,
  entityId: string,
  fields: string[],
  localeCodes: string[]
) {
  await requireAdmin();
  const rows = await translationService.getForEntity(entityType, entityId);
  const result: Record<string, number> = {};

  for (const code of localeCodes) {
    const translated = fields.filter((field) => {
      const row = rows.find(
        (r) => r.field === field && r.localeCode === code && r.value.trim()
      );
      return !!row;
    }).length;
    result[code] = fields.length > 0 ? Math.round((translated / fields.length) * 100) : 100;
  }

  return result;
}

export async function getEntityCompletionStatsAction(
  entityType: string,
  entityId: string,
  localeCodes: string[]
) {
  await requireAdmin();
  return translationService.getEntityCompletionStats(entityType, entityId, localeCodes);
}

export async function listTranslationVersionsAction(translationId: string) {
  await requireAdmin();
  return translationService.listTranslationVersions(translationId);
}

export async function restoreTranslationVersionAction(translationId: string, versionId: string) {
  await requireAdmin();
  const row = await translationService.restoreVersion(translationId, versionId);
  revalidatePath("/admin/translations");
  return row;
}

export async function queueAiTranslationAction(localeCode: string, entityType?: string) {
  await requireAdmin();
  const job = await aiCapability.queueTranslationJob(localeCode, entityType);
  revalidatePath("/admin/translations");
  return { success: true, jobId: job.id };
}

export async function processTranslationJobsAction() {
  await requireAdmin();
  const result = await aiCapability.processJobs();
  revalidatePath("/admin/translations");
  revalidatePath("/admin/languages");
  return { success: true, ...result };
}

export async function listEditableTranslationsAction(query: ListEditableTranslationsQuery) {
  const startedAt = Date.now();
  await requireAdmin();
  const result = await translationService.listEditableTranslationRows(query);
  return result;
}

export async function bulkDeleteTranslationsAction(
  refs: Array<Pick<EntityTranslationInput, "entityType" | "entityId" | "field" | "localeCode">>
) {
  await requireAdmin();
  const deletedCount = await translationService.deleteMany(refs);
  revalidatePath("/admin/translations");
  return { success: true, deletedCount };
}

export async function importTranslationsCsvAction(
  content: string,
  options: { dryRun?: boolean } = {}
) {
  await requireAdmin();
  const preview = parseTranslationsCsv(content);
  if (options.dryRun !== false) {
    return {
      dryRun: true as const,
      ...preview,
      appliedCount: 0,
    };
  }

  if (preview.valid.length === 0) {
    return {
      dryRun: false as const,
      ...preview,
      appliedCount: 0,
    };
  }

  const inputs: EntityTranslationInput[] = preview.valid.map((row) => ({
    entityType: row.entityType,
    entityId: row.entityId,
    field: row.field,
    localeCode: row.localeCode,
    value: row.value,
    status: row.status ?? "PUBLISHED",
  }));
  await translationService.upsertMany(inputs);
  revalidatePath("/admin/translations");
  return {
    dryRun: false as const,
    ...preview,
    appliedCount: inputs.length,
  };
}

export async function importTranslationsJsonAction(
  content: string,
  options: { dryRun?: boolean } = {}
) {
  await requireAdmin();
  const preview = parseTranslationsJson(content);
  if (options.dryRun !== false) {
    return {
      dryRun: true as const,
      ...preview,
      appliedCount: 0,
    };
  }

  if (preview.valid.length === 0) {
    return {
      dryRun: false as const,
      ...preview,
      appliedCount: 0,
    };
  }

  const inputs: EntityTranslationInput[] = preview.valid.map((row) => ({
    entityType: row.entityType,
    entityId: row.entityId,
    field: row.field,
    localeCode: row.localeCode,
    value: row.value,
    status: row.status ?? "PUBLISHED",
  }));
  await translationService.upsertMany(inputs);
  revalidatePath("/admin/translations");
  return {
    dryRun: false as const,
    ...preview,
    appliedCount: inputs.length,
  };
}

export async function bulkSaveTranslationGridAction(
  cells: BulkSaveCellInput[]
): Promise<BulkSaveResult> {
  await requireAdmin();
  const errors: BulkSaveResult["errors"] = [];
  const upsertInputs: EntityTranslationInput[] = [];
  const deleteRefs: Array<
    Pick<EntityTranslationInput, "entityType" | "entityId" | "field" | "localeCode">
  > = [];

  for (const cell of cells) {
    const key = `${cell.entityType}|${cell.entityId}|${cell.field}|${cell.localeCode}`;
    const config = getEntityConfig(cell.entityType);
    if (!config) {
      errors.push({ key, message: `Unknown entityType: ${cell.entityType}` });
      continue;
    }
    if (!config.fields.some((f) => f.field === cell.field)) {
      errors.push({ key, message: `Unknown field: ${cell.field}` });
      continue;
    }

    if (cell.delete || !cell.value.trim()) {
      deleteRefs.push({
        entityType: cell.entityType,
        entityId: cell.entityId,
        field: cell.field,
        localeCode: cell.localeCode,
      });
    } else {
      upsertInputs.push({
        entityType: cell.entityType,
        entityId: cell.entityId,
        field: cell.field,
        localeCode: cell.localeCode,
        value: cell.value,
        status: cell.status ?? "PUBLISHED",
      });
    }
  }

  let deletedCount = 0;
  let upsertedCount = 0;

  if (deleteRefs.length > 0) {
    deletedCount = await translationService.deleteMany(deleteRefs);
  }
  if (upsertInputs.length > 0) {
    await translationService.upsertMany(upsertInputs);
    upsertedCount = upsertInputs.length;
  }

  revalidatePath("/admin/translations");
  return {
    success: errors.length === 0,
    upsertedCount,
    deletedCount,
    errors,
  };
}

export async function exportFilteredGridCsvAction(
  query: Omit<ListEditableTranslationsQuery, "page" | "pageSize"> & { maxRows?: number }
) {
  await requireAdmin();
  const maxRows = query.maxRows ?? 5000;
  const pageSize = Math.min(maxRows, 500);
  const allRows: Array<{
    entityType: string;
    entityId: string;
    field: string;
    localeCode: string;
    value: string;
    status?: TranslationStatus;
  }> = [];

  let page = 1;
  let total = Infinity;

  while (allRows.length < maxRows && (page - 1) * pageSize < total) {
    const result = await translationService.listEditableTranslationRows({
      ...query,
      page,
      pageSize,
    });
    total = result.total;

    for (const row of result.rows) {
      for (const [localeCode, cell] of Object.entries(row.cells)) {
        if (!cell.value.trim()) continue;
        allRows.push({
          entityType: row.entityType,
          entityId: row.entityId,
          field: row.field,
          localeCode,
          value: cell.value,
          status: cell.status,
        });
        if (allRows.length >= maxRows) break;
      }
      if (allRows.length >= maxRows) break;
    }
    page += 1;
    if (result.rows.length === 0) break;
  }

  return rowsToCsv(allRows);
}
