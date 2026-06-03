"use server";

import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/features/auth/guards";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { translationJobService } from "@/features/translation/translation-job.service";
import { uiMessageService, getMergedMessages } from "@/features/translation/ui-message.service";
import type { EntityTranslationInput } from "@/features/translation/types";
import type { TranslationStatus } from "@prisma/client";

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
  await translationService.upsertMany(inputs);
  revalidatePath("/admin/translations");
  return { success: true };
}

export async function bulkCopyTranslationsAction(
  entityType: string,
  entityId: string,
  sourceLanguageCode: string,
  targetLanguageCode: string,
  status: TranslationStatus = "DRAFT"
) {
  await requireAdmin();
  const rows = await translationService.bulkCopyFromSource({
    entityType,
    entityId,
    sourceLanguageCode,
    targetLanguageCode,
    status,
  });
  revalidatePath("/admin/translations");
  return { success: true, count: rows.length };
}

export async function upsertUiMessageAction(
  namespace: string,
  key: string,
  languageCode: string,
  value: string,
  status: TranslationStatus = "PUBLISHED"
) {
  await requireAdmin();
  await uiMessageService.upsert(namespace, key, languageCode, value, status);
  revalidatePath("/admin/translations");
  revalidatePath("/admin/ui-messages");
  return { success: true };
}

export async function searchUiMessagesAction(query: string, languageCode?: string) {
  await requireAdmin();
  return uiMessageService.search(query, languageCode);
}

export async function searchTranslationsAction(
  query: string,
  entityType?: string,
  languageCode?: string
) {
  await requireAdmin();
  return translationService.searchTranslations(query, { entityType, languageCode });
}

export async function upsertLocalizedSlugAction(
  entityType: string,
  entityId: string,
  languageCode: string,
  slug: string
) {
  await requireAdmin();
  await translationService.upsertSlug(entityType, entityId, languageCode, slug);
  return { success: true };
}

export async function getEntityTranslationsAction(entityType: string, entityId: string) {
  await requireAdmin();
  return translationService.getForEntity(entityType, entityId);
}

export async function getCompletionMatrixAction() {
  await requireAdmin();
  const enabled = await localeService.listEnabled();
  const nonDefault = enabled.filter((l) => !l.isDefault);
  return translationService.getCompletionMatrix(nonDefault.map((l) => l.code));
}

export async function findMissingForCellAction(
  entityType: string,
  languageCode: string,
  limit = 100
) {
  await requireAdmin();
  return translationService.findMissing(entityType, languageCode, limit);
}

export async function findPriorityMissingAction(limit = 30) {
  await requireAdmin();
  return translationService.findPriorityMissing(limit);
}

export async function scaffoldLocaleTranslationsAction(targetLanguageCode: string) {
  await requireAdmin();
  const job = await translationJobService.createJob(targetLanguageCode);
  try {
    const count = await translationService.scaffoldLocaleFromEnglish(targetLanguageCode, job.id);
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

export async function getLocaleCompletionAction(languageCode: string) {
  await requireAdmin();
  const percentage = await translationService.getOverallCompletionForLocale(languageCode);
  return { percentage };
}

export async function bulkUpsertTranslationsAction(inputs: EntityTranslationInput[]) {
  await requireAdmin();
  await translationService.upsertMany(inputs);
  revalidatePath("/admin/translations");
  return { success: true };
}

export async function getUiMessagesGridAction() {
  await requireAdmin();
  const locales = await localeService.listEnabled();
  const rows = await uiMessageService.getAllGrouped();
  return { locales, rows };
}

export async function exportMergedMessagesAction(languageCode: string) {
  await requireAdmin();
  const filePath = path.join(process.cwd(), "messages", `${languageCode}.json`);
  let fileMessages: Record<string, unknown> = {};
  try {
    fileMessages = JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    /* empty */
  }
  const merged = await getMergedMessages(languageCode, fileMessages);
  return JSON.stringify(merged, null, 2);
}

export async function importUiMessagesJsonAction(languageCode: string, jsonText: string) {
  await requireAdmin();
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;
  const count = await uiMessageService.importFromFlatDict(parsed, languageCode);
  revalidatePath("/admin/ui-messages");
  return { success: true, count };
}

export async function exportLocaleBundleAction(languageCode: string) {
  await requireAdmin();
  const messagesJson = await exportMergedMessagesAction(languageCode);
  const csv = await translationService.exportEntityTranslationsCsv(languageCode);
  return { messagesJson, csv, languageCode };
}

export async function getEntityFieldCompletionAction(
  entityType: string,
  entityId: string,
  fields: string[],
  languageCodes: string[]
) {
  await requireAdmin();
  const rows = await translationService.getForEntity(entityType, entityId);
  const result: Record<string, number> = {};

  for (const code of languageCodes) {
    const translated = fields.filter((field) => {
      const row = rows.find(
        (r) => r.field === field && r.languageCode === code && r.value.trim()
      );
      return !!row;
    }).length;
    result[code] = fields.length > 0 ? Math.round((translated / fields.length) * 100) : 100;
  }

  return result;
}
