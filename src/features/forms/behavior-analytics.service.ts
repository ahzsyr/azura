import "server-only";

import { prisma } from "@/lib/prisma";

export type BehaviorEventInput = {
  schemaId: string;
  type: string;
  sessionId?: string;
  bindingId?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export async function recordBehaviorEvent(input: BehaviorEventInput): Promise<void> {
  await prisma.formBehaviorEvent.create({
    data: {
      schemaId: input.schemaId,
      type: input.type,
      sessionId: input.sessionId ?? null,
      bindingId: input.bindingId ?? null,
      payload: (input.payload ?? {}) as object,
      metadata: (input.metadata ?? {}) as object,
    },
  });
}

export type BehaviorMetrics = {
  views: number;
  focusEvents: number;
  blurEvents: number;
  changes: number;
  submissions: number;
  completionRate: number;
};

export type FieldPerformance = {
  bindingId: string;
  focusCount: number;
  changeCount: number;
  blurCount: number;
  /** Estimated completion rate 0–100 based on changes vs focuses (or views). */
  completionPercent: number;
};

export async function computeBehaviorMetrics(
  schemaId?: string,
  since?: Date,
): Promise<BehaviorMetrics> {
  const where = {
    schemaId: schemaId ?? undefined,
    createdAt: since ? { gte: since } : undefined,
  };

  const [views, focusEvents, blurEvents, changes, submissions] = await Promise.all([
    prisma.formBehaviorEvent.count({ where: { ...where, type: "schema.viewed" } }),
    prisma.formBehaviorEvent.count({ where: { ...where, type: "binding.focused" } }),
    prisma.formBehaviorEvent.count({ where: { ...where, type: "binding.blurred" } }),
    prisma.formBehaviorEvent.count({ where: { ...where, type: "binding.changed" } }),
    prisma.formBehaviorEvent.count({ where: { ...where, type: "interaction.submitted" } }),
  ]);

  const sessions = await prisma.formBehaviorEvent.groupBy({
    by: ["sessionId"],
    where: { ...where, sessionId: { not: null } },
  });

  const completedSessions = submissions > 0 ? submissions : 0;
  const completionRate = sessions.length > 0 ? completedSessions / sessions.length : 0;

  return {
    views,
    focusEvents,
    blurEvents,
    changes,
    submissions,
    completionRate: Math.round(completionRate * 100) / 100,
  };
}

export async function computeFieldPerformance(
  schemaId: string,
  since?: Date,
): Promise<FieldPerformance[]> {
  const where = {
    schemaId,
    createdAt: since ? { gte: since } : undefined,
    bindingId: { not: null },
  };

  const rows = await prisma.formBehaviorEvent.groupBy({
    by: ["bindingId", "type"],
    where,
    _count: { _all: true },
  });

  const byBinding = new Map<string, { focus: number; change: number; blur: number }>();
  for (const row of rows) {
    const id = row.bindingId!;
    const cur = byBinding.get(id) ?? { focus: 0, change: 0, blur: 0 };
    if (row.type === "binding.focused") cur.focus = row._count._all;
    if (row.type === "binding.changed") cur.change = row._count._all;
    if (row.type === "binding.blurred") cur.blur = row._count._all;
    byBinding.set(id, cur);
  }

  return [...byBinding.entries()].map(([bindingId, counts]) => {
    const denom = Math.max(counts.focus, counts.blur, 1);
    const completionPercent = Math.min(100, Math.round((counts.change / denom) * 100));
    return {
      bindingId,
      focusCount: counts.focus,
      changeCount: counts.change,
      blurCount: counts.blur,
      completionPercent,
    };
  }).sort((a, b) => a.completionPercent - b.completionPercent);
}
