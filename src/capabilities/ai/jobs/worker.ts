import "server-only";

import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import { getDefaultTranslationProvider } from "@/capabilities/ai/providers/openai";
import { translationMemoryService } from "@/capabilities/ai/memory/translation-memory.service";
import { translationJobService } from "@/capabilities/ai/jobs/translation-job.service";
import { translationService } from "@/features/translation/translation.service";
import type { TranslationProvider } from "@/capabilities/ai/providers/types";
import { listRegisteredEntityTypes } from "@/features/translation/entity-registry";

const BATCH_SIZE = 10;

type WorkItem = {
  entityType: string;
  entityId: string;
  field: string;
  sourceText: string;
  sourceLocale: string;
  targetLocale: string;
};

async function collectWorkItems(
  targetLocaleCode: string,
  entityTypeFilter?: string | null
): Promise<WorkItem[]> {
  const enabled = await localeService.listEnabled();
  const sourceLocale = enabled.find((l) => l.isDefault)?.code ?? "en";
  if (targetLocaleCode.toLowerCase() === sourceLocale.toLowerCase()) return [];

  const entityTypes = entityTypeFilter
    ? [entityTypeFilter]
    : listRegisteredEntityTypes().map((t) => t.type);

  const items: WorkItem[] = [];

  for (const entityType of entityTypes) {
    const missing = await translationService.findMissing(entityType, targetLocaleCode, 200);
    for (const row of missing) {
      const sourceText = row.sourceValue?.trim();
      if (!sourceText) continue;
      items.push({
        entityType: row.entityType,
        entityId: row.entityId,
        field: row.field,
        sourceText,
        sourceLocale,
        targetLocale: targetLocaleCode,
      });
    }
  }

  return items;
}

async function translateWorkItems(
  items: WorkItem[],
  provider: TranslationProvider
): Promise<number> {
  let processed = 0;

  for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
    const batch = items.slice(offset, offset + BATCH_SIZE);
    const cached = await translationMemoryService.lookupBatch(
      batch.map((item) => ({
        sourceText: item.sourceText,
        sourceLocale: item.sourceLocale,
        targetLocale: item.targetLocale,
      }))
    );

    const toTranslate: { item: WorkItem; index: number }[] = [];
    const translated: string[] = new Array(batch.length);

    for (let i = 0; i < batch.length; i++) {
      const hit = cached[i];
      if (hit) {
        translated[i] = hit;
      } else {
        toTranslate.push({ item: batch[i], index: i });
      }
    }

    if (toTranslate.length > 0) {
      const apiResults = await provider.translateBatch(
        toTranslate.map(({ item }) => ({
          sourceText: item.sourceText,
          sourceLocale: item.sourceLocale,
          targetLocale: item.targetLocale,
        }))
      );
      for (let j = 0; j < toTranslate.length; j++) {
        translated[toTranslate[j].index] = apiResults[j];
      }
    }

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const targetText = translated[i]?.trim();
      if (!targetText) continue;

      await translationService.upsert({
        entityType: item.entityType,
        entityId: item.entityId,
        field: item.field,
        localeCode: item.targetLocale,
        value: targetText,
        status: "DRAFT",
      });

      if (!cached[i]) {
        await translationMemoryService.store(
          item.sourceText,
          targetText,
          item.sourceLocale,
          item.targetLocale
        );
      }

      processed++;
    }
  }

  return processed;
}

export async function processPendingTranslationJobs(
  provider: TranslationProvider = getDefaultTranslationProvider()
): Promise<{ processedJobs: number; translatedFields: number }> {
  if (!provider.isAvailable()) {
    throw new Error("Translation provider is not configured");
  }

  const pending = await prisma.translationJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  let translatedFields = 0;

  for (const job of pending) {
    try {
      const workItems = await collectWorkItems(job.localeCode, job.entityType);
      await translationJobService.markRunning(job.id, workItems.length);

      const count = await translateWorkItems(workItems, provider);
      translatedFields += count;

      await translationJobService.markProgress(job.id, count);
      await translationJobService.completeJob(job.id, "COMPLETED");
      await translationService.syncLocaleCompletionPercent(job.localeCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Translation job failed";
      await translationJobService.completeJob(job.id, "FAILED", message);
    }
  }

  return { processedJobs: pending.length, translatedFields };
}
