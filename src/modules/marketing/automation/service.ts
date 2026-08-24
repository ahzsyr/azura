import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const automationService = {
  async listRules() {
    return prisma.marketingAutomationRule.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { executions: true } } },
    });
  },

  async upsertRule(input: {
    id?: string;
    name: string;
    enabled?: boolean;
    triggerType: string;
    conditions?: Record<string, unknown>;
    actions?: unknown[];
  }) {
    if (input.id) {
      return prisma.marketingAutomationRule.update({
        where: { id: input.id },
        data: {
          name: input.name,
          enabled: input.enabled ?? true,
          triggerType: input.triggerType,
          conditions: (input.conditions ?? {}) as Prisma.InputJsonValue,
          actions: (input.actions ?? []) as Prisma.InputJsonValue,
        },
      });
    }
    return prisma.marketingAutomationRule.create({
      data: {
        name: input.name,
        enabled: input.enabled ?? true,
        triggerType: input.triggerType,
        conditions: (input.conditions ?? {}) as Prisma.InputJsonValue,
        actions: (input.actions ?? []) as Prisma.InputJsonValue,
      },
    });
  },

  async deleteRule(id: string) {
    return prisma.marketingAutomationRule.delete({ where: { id } });
  },

  async evaluateTrigger(triggerType: string, payload: Record<string, unknown>) {
    const rules = await prisma.marketingAutomationRule.findMany({
      where: { enabled: true, triggerType },
    });

    for (const rule of rules) {
      const conditions = (rule.conditions ?? {}) as Record<string, unknown>;
      let pass = true;
      if (typeof conditions.threshold === "number" && typeof payload.value === "number") {
        const op = String(conditions.operator ?? "gt");
        if (op === "gt") pass = payload.value > conditions.threshold;
        if (op === "lt") pass = payload.value < conditions.threshold;
        if (op === "gte") pass = payload.value >= conditions.threshold;
        if (op === "lte") pass = payload.value <= conditions.threshold;
      }

      const status = pass ? "executed" : "skipped";
      await prisma.marketingAutomationExecution.create({
        data: {
          ruleId: rule.id,
          status,
          payload: payload as Prisma.InputJsonValue,
          result: { pass, actions: rule.actions } as Prisma.InputJsonValue,
        },
      });
      if (pass) {
        await prisma.marketingAutomationRule.update({
          where: { id: rule.id },
          data: { lastRunAt: new Date() },
        });
      }
    }
  },
};
