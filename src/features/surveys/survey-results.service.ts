import "server-only";

import { prisma } from "@/lib/prisma";

export type SurveyResultsSummary = {
  submissions: number;
  avgNps: number | null;
  avgRating: number | null;
  npsDistribution: Record<string, number>;
};

/** Aggregate NPS/rating from SURVEY template submissions. */
export async function computeSurveyResults(templateId: string): Promise<SurveyResultsSummary> {
  const rows = await prisma.formSubmission.findMany({
    where: { templateId },
    select: { payload: true },
    take: 2000,
  });

  let npsSum = 0;
  let npsCount = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  const npsDistribution: Record<string, number> = {};

  for (const row of rows) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const nps = Number(payload.nps ?? payload.score ?? payload.rating);
    if (!Number.isNaN(nps) && payload.nps != null) {
      npsSum += nps;
      npsCount += 1;
      const key = String(Math.round(nps));
      npsDistribution[key] = (npsDistribution[key] ?? 0) + 1;
    } else if (!Number.isNaN(nps) && payload.rating != null) {
      ratingSum += nps;
      ratingCount += 1;
    }
  }

  return {
    submissions: rows.length,
    avgNps: npsCount ? Math.round((npsSum / npsCount) * 10) / 10 : null,
    avgRating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    npsDistribution,
  };
}
