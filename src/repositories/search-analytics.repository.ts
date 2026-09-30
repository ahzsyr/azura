import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { SearchAnalyticsFile } from "@/capabilities/search/analytics/search-analytics.types";

export const searchAnalyticsRepository = {
  async get(locale: string): Promise<SearchAnalyticsFile | null> {
    const row = await prisma.searchAnalyticsSnapshot.findUnique({
      where: { locale: locale.toLowerCase() },
    });
    if (!row?.data || typeof row.data !== "object") return null;
    const data = row.data as unknown as SearchAnalyticsFile;
    if (data?.version !== 1 || !data.totals) return null;
    return data;
  },

  async set(locale: string, data: SearchAnalyticsFile): Promise<void> {
    const loc = locale.toLowerCase();
    await prisma.searchAnalyticsSnapshot.upsert({
      where: { locale: loc },
      create: {
        locale: loc,
        data: data as unknown as Prisma.InputJsonValue,
      },
      update: {
        data: data as unknown as Prisma.InputJsonValue,
      },
    });
  },
};
