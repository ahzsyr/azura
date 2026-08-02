import type { SearchIntelligenceIssue } from "../types";
import type { StaticAnalysisInput } from "../technical-seo";
import { runStaticAnalysis } from "../technical-seo";

export type AiAuditSignals = {
  searchIntentFit?: number;
  readability?: number;
  trust?: number;
  authority?: number;
  ctaQuality?: number;
  topicalCoverage?: number;
  semanticDepth?: number;
};

export type PageAuditScore = {
  url: string;
  total: number;
  rulesScore: number;
  aiScore: number;
  rulesWeight: number;
  aiWeight: number;
  issues: SearchIntelligenceIssue[];
  suggestions: string[];
};

const RULES_WEIGHT = 0.6;
const AI_WEIGHT = 0.4;

function average(values: Array<number | undefined>, fallback = 0.7): number {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (!nums.length) return fallback;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function rulesScoreFromIssues(issues: SearchIntelligenceIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 18;
    else if (issue.severity === "warn") score -= 8;
    else score -= 3;
  }
  return Math.max(0, Math.min(100, score));
}

export function scorePageAudit(input: {
  page: StaticAnalysisInput;
  ai?: AiAuditSignals;
}): PageAuditScore {
  const issues = runStaticAnalysis(input.page);
  const rulesScore = rulesScoreFromIssues(issues);
  const aiScore = Math.round(
    average([
      input.ai?.searchIntentFit,
      input.ai?.readability,
      input.ai?.trust,
      input.ai?.authority,
      input.ai?.ctaQuality,
      input.ai?.topicalCoverage,
      input.ai?.semanticDepth,
    ]) * 100,
  );

  const total = Math.round(rulesScore * RULES_WEIGHT + aiScore * AI_WEIGHT);
  const suggestions: string[] = [];

  if (issues.some((i) => i.title === "Missing title")) suggestions.push("Add a unique title tag.");
  if (issues.some((i) => i.title === "Missing description")) suggestions.push("Write a 120–160 character meta description.");
  if (issues.some((i) => i.title === "Duplicate H1")) suggestions.push("Keep a single H1 that matches search intent.");
  if (issues.some((i) => i.title === "No internal links")) suggestions.push("Add internal links to related products, FAQs, and articles.");
  if ((input.ai?.ctaQuality ?? 1) < 0.6) suggestions.push("Strengthen the primary CTA and place it above the fold.");
  if ((input.ai?.topicalCoverage ?? 1) < 0.6) suggestions.push("Expand topical coverage with supporting sections and FAQs.");
  if ((input.ai?.semanticDepth ?? 1) < 0.6) suggestions.push("Add entity mentions (brand, product, location) for semantic depth.");

  return {
    url: input.page.url,
    total,
    rulesScore,
    aiScore,
    rulesWeight: RULES_WEIGHT,
    aiWeight: AI_WEIGHT,
    issues,
    suggestions,
  };
}
