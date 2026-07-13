import type { TranslationJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const translationJobService = {
  async createJob(localeCode: string, entityType?: string) {
    return prisma.translationJob.create({
      data: {
        localeCode,
        entityType: entityType ?? null,
        status: "PENDING",
      },
    });
  },

  async markRunning(id: string, totalEntities: number) {
    return prisma.translationJob.update({
      where: { id },
      data: { status: "RUNNING", totalEntities, processedCount: 0 },
    });
  },

  async markProgress(id: string, processedCount: number) {
    return prisma.translationJob.update({
      where: { id },
      data: { processedCount },
    });
  },

  async completeJob(id: string, status: TranslationJobStatus = "COMPLETED", errorMessage?: string) {
    return prisma.translationJob.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        completedAt: new Date(),
      },
    });
  },

  async listRecent(limit = 20) {
    return prisma.translationJob.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
