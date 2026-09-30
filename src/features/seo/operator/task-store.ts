import "server-only";

import type { Prisma } from "@prisma/client";
import { jsonStoreService } from "@/features/storage/json-store.service";
import type { SeoTaskStateRecord, SeoTaskStatus } from "./types";

const NAMESPACE = "seo-task-state";
const KEY = "statuses";

export const seoTaskStateStore = {
  async get(): Promise<SeoTaskStateRecord> {
    const stored = await jsonStoreService.get<SeoTaskStateRecord>(NAMESPACE, KEY);
    return { statuses: stored?.statuses ?? {} };
  },

  async setStatus(taskId: string, status: SeoTaskStatus): Promise<SeoTaskStateRecord> {
    const current = await this.get();
    const next: SeoTaskStateRecord = {
      statuses: { ...current.statuses, [taskId]: status },
    };
    await jsonStoreService.set(NAMESPACE, KEY, next as unknown as Prisma.InputJsonValue);
    return next;
  },
};
