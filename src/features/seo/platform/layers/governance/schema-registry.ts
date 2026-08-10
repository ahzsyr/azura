import { pluginSdk } from "../../plugin-sdk";
import type { SeoSchemaDefinition, SeoStrategyDefinition } from "../../types";

export function getStrategy(id: string): SeoStrategyDefinition | undefined {
  return pluginSdk.getStrategies().find((s) => s.id === id);
}

export function resolveStrategyRules(strategyId: string) {
  const strategy = getStrategy(strategyId);
  if (!strategy) return pluginSdk.getRules();
  const ids = new Set(strategy.ruleIds);
  return pluginSdk.getRules().filter((r) => ids.has(r.id));
}

export function resolveStrategyTemplates(strategyId: string) {
  const strategy = getStrategy(strategyId);
  if (!strategy) return pluginSdk.getTemplates();
  const ids = new Set(strategy.templateIds);
  return pluginSdk.getTemplates().filter((t) => ids.has(t.id));
}

export const strategyRegistry = {
  get: getStrategy,
  list: () => pluginSdk.getStrategies(),
  resolveRules: resolveStrategyRules,
  resolveTemplates: resolveStrategyTemplates,
};

export function getSchema(id: string): SeoSchemaDefinition | undefined {
  return pluginSdk.getSchemas().find((s) => s.id === id);
}

export function buildSchemaJsonLd(
  schemaId: string,
  ctx: Record<string, unknown>
): Record<string, unknown> | undefined {
  const schema = getSchema(schemaId);
  if (!schema) return undefined;
  return schema.factory(ctx);
}

export const schemaRegistry = {
  get: getSchema,
  list: () => pluginSdk.getSchemas(),
  build: buildSchemaJsonLd,
};
