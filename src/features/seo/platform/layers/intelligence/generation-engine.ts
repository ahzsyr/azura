import { getPublicBrandName } from "@/config/site";
import { pluginSdk } from "../../plugin-sdk";
import { loadKnowledgeContext } from "../governance/knowledge-store";
import { evaluateRules } from "../governance/rule-engine";
import { seoEventBus } from "../../event-bus/bus";
import type {
  ContentSnapshot,
  RuleResult,
  SeoExecutionContext,
  SeoSuggestion,
} from "../../types";
import {
  buildProvenance,
  pickTemplateForField,
  resolveTemplates,
} from "./template-engine";

function extractKeywords(snapshot: ContentSnapshot): string {
  const words = snapshot.paragraphs
    .join(" ")
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4);
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)
    .join(", ");
}

function trimToLength(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

export async function generateRuleBasedSuggestion(
  ctx: SeoExecutionContext,
  snapshot: ContentSnapshot,
  rules?: RuleResult
): Promise<SeoSuggestion> {
  const ruleResult = rules ?? (await evaluateRules(ctx, snapshot));
  const templates = resolveTemplates(ctx, snapshot);
  const knowledge = await loadKnowledgeContext();
  const brand = getPublicBrandName();

  for (const provider of pluginSdk.getProviders()) {
    if (provider.id === "rule-based" || provider.id === "ai") continue;
    const fromProvider = await provider.generate({
      ctx,
      snapshot,
      rules: ruleResult,
      templates,
      knowledge,
    });
    if (fromProvider.metaTitle || fromProvider.metaDescription) {
      await seoEventBus.emit("suggestion.generated", { ctx, suggestion: fromProvider });
      return fromProvider;
    }
  }

  const templateList = pluginSdk.getTemplates();
  const titleTemplate = pickTemplateForField(templateList, ctx, "metaTitle");
  const descTemplate = pickTemplateForField(templateList, ctx, "metaDescription");

  let metaTitle =
    titleTemplate?.pattern
      ? templates.find((t) => t.id === titleTemplate.id)?.resolved
      : undefined;
  metaTitle = metaTitle || trimToLength(snapshot.title, 60) || brand;

  const excerpt = snapshot.paragraphs[0]?.trim();
  let metaDescription =
    descTemplate?.pattern
      ? templates.find((t) => t.id === descTemplate.id)?.resolved
      : undefined;
  metaDescription =
    metaDescription ||
    trimToLength(excerpt || `${snapshot.title} — ${brand}`, 160);

  const ogImageUrl = snapshot.images.find((img) => img.src)?.src;

  const suggestion: SeoSuggestion = Object.freeze({
    metaTitle: trimToLength(metaTitle, 60),
    metaDescription: trimToLength(metaDescription, 160),
    focusKeywords: extractKeywords(snapshot),
    ogTitle: trimToLength(metaTitle, 70),
    ogImageUrl,
    robots: "index, follow",
    twitterCard: "summary_large_image",
    source: "rule-based",
    provenance: buildProvenance("rule-based", [
      { label: "ContentSnapshot", detail: snapshot.id },
      { label: "TemplateEngine" },
      { label: "RuleEngine", detail: `${ruleResult.violations.length} violations` },
      { label: "Knowledge", detail: `${knowledge.entries.length} entries` },
    ]),
  });

  await seoEventBus.emit("suggestion.generated", { ctx, suggestion });
  return suggestion;
}
