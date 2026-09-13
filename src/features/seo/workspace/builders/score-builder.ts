import type { SeoCategoryKey, SeoCategoryScores, SeoIssue, SeoUnifiedScore } from "../types";
import { SEVERITY_PENALTY } from "./issue-builder";

/** Documented weights — Overall is a weighted blend of category scores. */
export const CATEGORY_WEIGHTS: Record<SeoCategoryKey, number> = {
  content: 0.35,
  metadata: 0.25,
  technical: 0.25,
  schema: 0.15,
};

const CATEGORY_LABELS: Record<SeoCategoryKey, string> = {
  content: "Content",
  metadata: "Metadata",
  technical: "Technical",
  schema: "Structured Data",
};

function categoryForIssue(issue: SeoIssue): SeoCategoryKey | null {
  if (issue.category === "content") return "content";
  if (issue.category === "metadata") return "metadata";
  if (issue.category === "technical") return "technical";
  if (issue.category === "schema") return "schema";
  return null;
}

function scoreFromPenalties(penalties: number[]): number {
  const total = penalties.reduce((sum, p) => sum + p, 0);
  return Math.max(0, Math.min(100, 100 - total));
}

function gradeFromOverall(score: number): SeoUnifiedScore["grade"] {
  if (score >= 80) return "good";
  if (score >= 55) return "fair";
  return "poor";
}

export function buildUnifiedScore(issues: SeoIssue[]): SeoUnifiedScore {
  const open = issues.filter((i) => i.status === "open");
  const byCategory: Record<SeoCategoryKey, SeoIssue[]> = {
    content: [],
    metadata: [],
    technical: [],
    schema: [],
  };

  for (const issue of open) {
    const key = categoryForIssue(issue);
    if (key) byCategory[key].push(issue);
  }

  const categories = {} as SeoCategoryScores;
  for (const key of Object.keys(CATEGORY_WEIGHTS) as SeoCategoryKey[]) {
    const catIssues = byCategory[key];
    const penalties = catIssues.map(
      (i) => i.scorePenalty ?? SEVERITY_PENALTY[i.severity],
    );
    categories[key] = {
      key,
      label: CATEGORY_LABELS[key],
      score: scoreFromPenalties(penalties),
      weight: CATEGORY_WEIGHTS[key],
      issueIds: catIssues.map((i) => i.id),
    };
  }

  const overall = Math.round(
    (Object.keys(CATEGORY_WEIGHTS) as SeoCategoryKey[]).reduce(
      (sum, key) => sum + categories[key].score * CATEGORY_WEIGHTS[key],
      0,
    ),
  );

  return {
    overall,
    grade: gradeFromOverall(overall),
    categories,
  };
}
