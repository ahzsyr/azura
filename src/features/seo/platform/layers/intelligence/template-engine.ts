import { getPublicBrandName } from "@/config/site";
import { pluginSdk } from "../../plugin-sdk";
import type {
  ContentSnapshot,
  FieldProvenance,
  ResolvedTemplate,
  SeoExecutionContext,
  SeoSuggestion,
  SeoTemplate,
} from "../../types";

function resolveTokens(pattern: string, snapshot: ContentSnapshot, brand: string): string {
  return pattern
    .replace(/\{Title\}/gi, snapshot.title)
    .replace(/\{SiteName\}/gi, brand)
    .replace(/\{Brand\}/gi, brand)
    .replace(/\{ProductName\}/gi, snapshot.title)
    .replace(/\{Category\}/gi, snapshot.headings.find((h) => h.level === 2)?.text ?? "")
    .replace(/\{Country\}/gi, "")
    .trim();
}

export function resolveTemplates(
  ctx: SeoExecutionContext,
  snapshot: ContentSnapshot
): ResolvedTemplate[] {
  const brand = getPublicBrandName();
  const resolved: ResolvedTemplate[] = [];

  for (const template of pluginSdk.getTemplates()) {
    if (template.entityTypes?.length && !template.entityTypes.includes(ctx.entityType)) {
      continue;
    }
    resolved.push({
      id: template.id,
      pattern: template.pattern,
      resolved: resolveTokens(template.pattern, snapshot, brand),
    });
  }

  return resolved;
}

export function pickTemplateForField(
  templates: SeoTemplate[],
  ctx: SeoExecutionContext,
  field: SeoTemplate["field"]
): SeoTemplate | undefined {
  return templates.find(
    (t) =>
      t.field === field &&
      (!t.entityTypes?.length || t.entityTypes.includes(ctx.entityType))
  );
}

export function buildProvenance(
  source: SeoSuggestion["source"],
  steps: Array<{ label: string; detail?: string }>
): FieldProvenance {
  const chain = Object.freeze(steps.map((s) => Object.freeze({ ...s })));
  return Object.freeze({
    metaTitle: chain,
    metaDescription: chain,
    ogTitle: chain,
    focusKeywords: chain,
  });
}
