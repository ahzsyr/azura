import { getDefaultTranslationProvider } from "../providers/openai";
import type { TranslationItem } from "../providers/types";
import { translationJobService } from "../jobs/translation-job.service";
import { processPendingTranslationJobs } from "../jobs/worker";
import { translationMemoryService } from "../memory/translation-memory.service";

export const aiCapability = {
  id: "ai" as const,
  translateBatch(items: TranslationItem[]) {
    return getDefaultTranslationProvider().translateBatch(items);
  },
  queueTranslationJob: translationJobService.createJob.bind(translationJobService),
  processJobs: processPendingTranslationJobs,
  lookupMemory: translationMemoryService.lookup.bind(translationMemoryService),
  lookupMemoryBatch: translationMemoryService.lookupBatch.bind(translationMemoryService),
  storeMemory: translationMemoryService.store.bind(translationMemoryService),
  async generateContent() {
    throw new Error("AI content generation is not implemented yet");
  },
};
