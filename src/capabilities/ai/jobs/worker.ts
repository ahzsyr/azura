import "server-only";

import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import { createTranslationProvider } from "@/capabilities/ai/providers/factory";
import { translationMemoryService } from "@/capabilities/ai/memory/translation-memory.service";
import { translationJobService } from "@/capabilities/ai/jobs/translation-job.service";
import { translationService } from "@/features/translation/translation.service";
import type { TranslationProvider } from "@/capabilities/ai/providers/types";
import { listRegisteredEntityTypes } from "@/features/translation/entity-registry";

const BATCH_SIZE = 10;
/** Hard cap per process call — Hostinger request timeouts cannot finish large "All types" runs. */
const MAX_FIELDS_PER_RUN = 50;

type WorkItem = {
  entityType: string;
  entityId: string;
  field: string;
  sourceText: string;
  sourceLocale: string;
  targetLocale: string;
};

export type ProcessTranslationJobsResult = {
  processedJobs: number;
  translatedFields: number;
  remainingFields: number;
  error?: string;
};

async function collectWorkItems(
  targetLocaleCode: string,
  entityTypeFilter?: string | null,
  maxItems = MAX_FIELDS_PER_RUN
): Promise<{ items: WorkItem[]; hasMore: boolean }> {
  const enabled = await localeService.listEnabled();
  const sourceLocale = enabled.find((l) => l.isDefault)?.code ?? "en";
  if (targetLocaleCode.toLowerCase() === sourceLocale.toLowerCase()) {
    return { items: [], hasMore: false };
  }

  const entityTypes = entityTypeFilter
    ? [entityTypeFilter]
    : listRegisteredEntityTypes().map((t) => t.type);

  const items: WorkItem[] = [];
  let hasMore = false;

  for (const entityType of entityTypes) {
    if (items.length >= maxItems) {
      const extra = await translationService.findMissing(entityType, targetLocaleCode, 1);
      if (extra.some((row) => row.sourceValue?.trim())) {
        hasMore = true;
        break;
      }
      continue;
    }

    const room = maxItems - items.length;
    const missing = await translationService.findMissing(
      entityType,
      targetLocaleCode,
      // Fetch one extra so we know whether more remain after filling the cap.
      Math.min(200, room + 1)
    );

    for (const row of missing) {
      const sourceText = row.sourceValue?.trim();
      if (!sourceText) continue;
      if (items.length >= maxItems) {
        hasMore = true;
        break;
      }
      items.push({
        entityType: row.entityType,
        entityId: row.entityId,
        field: row.field,
        sourceText,
        sourceLocale,
        targetLocale: targetLocaleCode,
      });
    }
    if (hasMore) break;
  }

  return { items, hasMore };
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

export async function processPendingTranslationJobs(options?: {
  jobId?: string;
  provider?: TranslationProvider;
}): Promise<ProcessTranslationJobsResult> {
  const provider = options?.provider ?? (await createTranslationProvider());

  const pending = options?.jobId
    ? await prisma.translationJob.findMany({
        where: { id: options.jobId, status: "PENDING" },
        take: 1,
      })
    : await prisma.translationJob.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 5,
      });

  if (!provider.isAvailable()) {
    const message = `${provider.name} is not configured. Add credentials under Translations → Configuration.`;
    for (const job of pending) {
      await translationJobService.completeJob(job.id, "FAILED", message);
    }
    return {
      processedJobs: pending.length,
      translatedFields: 0,
      remainingFields: 0,
      error: message,
    };
  }

  let translatedFields = 0;
  let remainingFields = 0;

  for (const job of pending) {
    try {
      const { items: workItems, hasMore } = await collectWorkItems(
        job.localeCode,
        job.entityType,
        MAX_FIELDS_PER_RUN
      );
      if (hasMore) remainingFields += 1;

      await translationJobService.markRunning(
        job.id,
        workItems.length + (hasMore ? MAX_FIELDS_PER_RUN : 0)
      );

      const count = await translateWorkItems(workItems, provider);
      translatedFields += count;
      await translationJobService.markProgress(job.id, count);

      if (hasMore) {
        // Leave PENDING so another click continues the remaining fields.
        await prisma.translationJob.update({
          where: { id: job.id },
          data: { status: "PENDING", processedCount: count },
        });
      } else {
        await translationJobService.completeJob(job.id, "COMPLETED");
      }
      await translationService.syncLocaleCompletionPercent(job.localeCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Translation job failed";
      await translationJobService.completeJob(job.id, "FAILED", message);
      return {
        processedJobs: pending.length,
        translatedFields,
        remainingFields,
        error: message,
      };
    }
  }

  return {
    processedJobs: pending.length,
    translatedFields,
    remainingFields,
  };
}
