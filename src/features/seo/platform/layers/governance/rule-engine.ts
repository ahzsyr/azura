import { pluginSdk } from "../../plugin-sdk";
import { resolveStrategyRules } from "./schema-registry";
import { seoEventBus } from "../../event-bus/bus";
import type {
  ContentSnapshot,
  RuleResult,
  RuleViolation,
  SeoExecutionContext,
} from "../../types";

export async function evaluateRules(
  ctx: SeoExecutionContext,
  snapshot: ContentSnapshot
): Promise<RuleResult> {
  const violations: RuleViolation[] = [];
  const recommendations: string[] = [];

  const strategyId =
    typeof ctx.metadata?.strategyId === "string" ? ctx.metadata.strategyId : undefined;
  const rulesToEvaluate = strategyId
    ? resolveStrategyRules(strategyId)
    : pluginSdk.getRules();

  for (const rule of rulesToEvaluate) {
    if (rule.entityTypes?.length && !rule.entityTypes.includes(ctx.entityType)) {
      continue;
    }
    if (rule.when && !rule.when(snapshot)) continue;

    if (rule.requires?.length) {
      for (const req of rule.requires) {
        const met = checkRequirement(req, snapshot, ctx);
        if (!met) {
          violations.push({
            ruleId: rule.id,
            message: `${rule.message} (missing: ${req})`,
            severity: rule.severity,
          });
          recommendations.push(rule.message);
        }
      }
    }
  }

  const result: RuleResult = Object.freeze({
    violations: Object.freeze([...violations]),
    recommendations: Object.freeze([...recommendations]),
  });

  await seoEventBus.emit("rules.evaluated", { ctx, rules: result });
  return result;
}

function checkRequirement(
  requirement: string,
  snapshot: ContentSnapshot,
  ctx: SeoExecutionContext
): boolean {
  switch (requirement) {
    case "ProductSchema":
      return snapshot.products.length > 0;
    case "FAQSchema":
      return snapshot.signals.hasFaq || snapshot.faq.length > 0;
    case "Canonical":
      return true;
    case "OGImage":
      return snapshot.images.length > 0;
    case "Price":
      return snapshot.products.some((p) => p.price != null || p.priceValue != null);
    case "Availability":
      return snapshot.products.some((p) => p.availability != null);
    case "H1":
      return snapshot.signals.h1Count >= 1;
    default:
      if (ctx.entityType.toLowerCase().includes(requirement.toLowerCase())) return true;
      return false;
  }
}
