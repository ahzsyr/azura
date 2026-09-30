import "server-only";

import { queryInteractionEvents } from "@/features/forms/interaction-event.service";
import { prisma } from "@/lib/prisma";

export type OperationalDashboardMetrics = {
  submissions: number;
  avgScore: number;
  assigned: number;
  archived: number;
  byPipeline: Array<{ pipelineType: string; count: number }>;
  byTemplate: Array<{ templateId: string; name: string; count: number }>;
};

export async function computeOperationalDashboard(
  since?: Date,
): Promise<OperationalDashboardMetrics> {
  const dateFilter = since ? { gte: since } : undefined;

  const [submittedEvents, assignedEvents, archivedEvents, submissions, pipelineGroups] =
    await Promise.all([
      queryInteractionEvents({ type: "interaction.submitted", since }),
      queryInteractionEvents({ type: "interaction.assigned", since }),
      queryInteractionEvents({ type: "interaction.archived", since }),
      prisma.formSubmission.findMany({
        where: { createdAt: dateFilter },
        include: { template: { select: { id: true, name: true } } },
        take: 500,
      }),
      prisma.formSubmission.groupBy({
        by: ["pipelineType"],
        where: { createdAt: dateFilter, pipelineType: { not: null } },
        _count: { _all: true },
      }),
    ]);

  const scores = submittedEvents.map((e) => Number(e.payload.score ?? 0));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const templateCounts = new Map<string, { name: string; count: number }>();
  for (const s of submissions) {
    const id = s.templateId ?? "unknown";
    const name = s.template?.name ?? "Unknown";
    const entry = templateCounts.get(id) ?? { name, count: 0 };
    entry.count += 1;
    templateCounts.set(id, entry);
  }

  return {
    submissions: submittedEvents.length,
    avgScore: Math.round(avgScore * 10) / 10,
    assigned: assignedEvents.length,
    archived: archivedEvents.length,
    byPipeline: pipelineGroups
      .filter((g) => g.pipelineType)
      .map((g) => ({ pipelineType: g.pipelineType!, count: g._count._all })),
    byTemplate: [...templateCounts.entries()].map(([templateId, v]) => ({
      templateId,
      name: v.name,
      count: v.count,
    })),
  };
}
