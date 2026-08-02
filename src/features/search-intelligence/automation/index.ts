import { createEntityUuid } from "../entity-graph/ids";
import type { OperationsEngine } from "../operations";

export type AutomationTrigger =
  | "product.published"
  | "company.updated"
  | "page.published"
  | "schema.changed"
  | "schedule.daily";

export type AutomationStep = {
  definitionId: string;
  payload?: Record<string, unknown>;
};

export type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  steps: AutomationStep[];
  createdAt: string;
  updatedAt: string;
};

export type AutomationRun = {
  id: string;
  ruleId: string;
  startedAt: string;
  completedAt?: string | null;
  status: "running" | "completed" | "failed";
  operationIds: string[];
  error?: string | null;
};

export function createAutomationEngine(operations: OperationsEngine) {
  const rules = new Map<string, AutomationRule>();
  const runs: AutomationRun[] = [];

  function upsertRule(input: Omit<AutomationRule, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const now = new Date().toISOString();
    const id = input.id ?? createEntityUuid();
    const existing = rules.get(id);
    const rule: AutomationRule = {
      id,
      name: input.name,
      enabled: input.enabled,
      trigger: input.trigger,
      steps: input.steps,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    rules.set(id, rule);
    return rule;
  }

  async function runRule(ruleId: string, context: Record<string, unknown> = {}, actor?: string | null) {
    const rule = rules.get(ruleId);
    if (!rule) throw new Error(`Automation rule not found: ${ruleId}`);
    if (!rule.enabled) throw new Error(`Automation rule disabled: ${ruleId}`);

    const run: AutomationRun = {
      id: createEntityUuid(),
      ruleId,
      startedAt: new Date().toISOString(),
      status: "running",
      operationIds: [],
      completedAt: null,
      error: null,
    };
    runs.unshift(run);

    try {
      for (const step of rule.steps) {
        const record = operations.enqueue({
          definitionId: step.definitionId,
          payload: { ...(step.payload ?? {}), ...context, automationRuleId: rule.id },
          actor: actor ?? "automation",
          targetId: typeof context.targetId === "string" ? context.targetId : null,
          targetLabel: typeof context.targetLabel === "string" ? context.targetLabel : null,
        });
        run.operationIds.push(record.id);
        if (record.status === "queued") {
          await operations.execute(record.id, actor ?? "automation");
        }
      }
      run.status = "completed";
      run.completedAt = new Date().toISOString();
    } catch (error) {
      run.status = "failed";
      run.error = error instanceof Error ? error.message : String(error);
      run.completedAt = new Date().toISOString();
    }

    return run;
  }

  async function fire(trigger: AutomationTrigger, context: Record<string, unknown> = {}, actor?: string | null) {
    const matched = [...rules.values()].filter((r) => r.enabled && r.trigger === trigger);
    const results = [];
    for (const rule of matched) {
      results.push(await runRule(rule.id, context, actor));
    }
    return results;
  }

  // Seed useful defaults
  upsertRule({
    name: "When Product Published",
    enabled: true,
    trigger: "product.published",
    steps: [
      { definitionId: "schema.rebuild" },
      { definitionId: "sitemap.rebuild" },
      { definitionId: "google.request_indexing" },
      { definitionId: "ai.apply_metadata", payload: { suggestion: true } },
    ],
  });
  upsertRule({
    name: "When Company Updated",
    enabled: true,
    trigger: "company.updated",
    steps: [
      { definitionId: "google.sync_business_profile" },
      { definitionId: "entity.validate" },
      { definitionId: "schema.rebuild" },
      { definitionId: "google.request_indexing", payload: { path: "/" } },
    ],
  });

  return {
    upsertRule,
    listRules() {
      return [...rules.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
    getRule(id: string) {
      return rules.get(id) ?? null;
    },
    setEnabled(id: string, enabled: boolean) {
      const rule = rules.get(id);
      if (!rule) return null;
      rule.enabled = enabled;
      rule.updatedAt = new Date().toISOString();
      return rule;
    },
    runRule,
    fire,
    listRuns() {
      return [...runs];
    },
  };
}

export type AutomationEngine = ReturnType<typeof createAutomationEngine>;
