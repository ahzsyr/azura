import type { RegistrySpecDefinition, SpecMatchConfidence } from "./types";
import { loadSpecificationRegistry } from "./registry";

const SCORE_EXACT = 100;
const SCORE_CONTEXT_MATCH = 90;
const SCORE_ALIAS_MATCH = 75;
const SCORE_AMBIGUOUS = 40;
const ASSIGN_THRESHOLD = 70;

export type MatchCandidate = {
  specId: string;
  score: number;
  name: string;
  domain: string;
  displayGroup: string;
  unit?: string | null;
};

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function matchesPattern(value: string, patterns: string[] | undefined): boolean {
  if (!patterns?.length) return false;
  for (const pattern of patterns) {
    try {
      if (new RegExp(pattern, "i").test(value)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function sourceGroupOk(spec: RegistrySpecDefinition & { contexts?: { source_groups?: string[] } }, sourceGroup: string): boolean {
  const groups = (spec.contexts?.source_groups || []).map(normalizeLabel);
  if (!groups.length) return true;
  const sg = normalizeLabel(sourceGroup);
  return groups.some((g) => sg === g || g.includes(sg) || sg.includes(g));
}

function productDomainOk(
  spec: RegistrySpecDefinition & { contexts?: { product_domains?: string[] } },
  productDomain?: string,
): boolean {
  const domains = (spec.contexts?.product_domains || []).map(normalizeLabel);
  if (!domains.length || !productDomain) return true;
  const pd = normalizeLabel(productDomain);
  return domains.includes(pd) || domains.some((d) => pd.includes(d) || d.includes(pd));
}

function aliasHit(spec: RegistrySpecDefinition, label: string): boolean {
  const norm = normalizeLabel(label);
  if (normalizeLabel(spec.name || "") === norm) return true;
  return (spec.aliases || []).some((alias) => normalizeLabel(alias) === norm);
}

function scoreCandidate(
  spec: RegistrySpecDefinition & { contexts?: { source_groups?: string[]; product_domains?: string[] }; value_patterns?: string[] },
  sourceGroup: string,
  sourceLabel: string,
  value: string,
  productDomain?: string,
): number {
  if (!aliasHit(spec, sourceLabel)) return 0;

  const labelNorm = normalizeLabel(sourceLabel);
  const nameNorm = normalizeLabel(spec.name || "");
  const exactName = labelNorm === nameNorm;

  let score = SCORE_ALIAS_MATCH;
  const groupOk = sourceGroupOk(spec, sourceGroup);
  const domainOk = productDomainOk(spec, productDomain);
  const valuePatterns = spec.value_patterns || [];
  const valueOk = valuePatterns.length ? matchesPattern(value, valuePatterns) : false;

  if (valuePatterns.length && !valueOk && !exactName) return 0;

  if (groupOk && domainOk && valueOk) return SCORE_EXACT;
  if (groupOk && domainOk) return SCORE_CONTEXT_MATCH;
  if (groupOk || domainOk) return Math.max(score, SCORE_ALIAS_MATCH);
  if (valueOk && valuePatterns.length) return SCORE_CONTEXT_MATCH;
  return domainOk ? score : 0;
}

function shouldAssign(score: number, candidateCount: number): { assign: boolean; reason: SpecMatchConfidence } {
  if (candidateCount === 0) return { assign: false, reason: "UNMAPPED" };
  if (candidateCount > 1 && score < SCORE_EXACT) return { assign: false, reason: "AMBIGUOUS" };
  if (score >= ASSIGN_THRESHOLD) {
    if (score >= SCORE_EXACT) return { assign: true, reason: "EXACT" };
    if (score >= SCORE_CONTEXT_MATCH) return { assign: true, reason: "CONTEXT_MATCH" };
    return { assign: true, reason: "ALIAS_MATCH" };
  }
  if (candidateCount > 1) return { assign: false, reason: "AMBIGUOUS" };
  return { assign: false, reason: "UNMAPPED" };
}

export function findCandidates(
  sourceGroup: string,
  sourceLabel: string,
  value: string,
  productDomain?: string,
): MatchCandidate[] {
  const labelNorm = normalizeLabel(sourceLabel);
  if (!labelNorm) return [];

  const ambiguousLabel = labelNorm === "power";
  const registry = loadSpecificationRegistry();
  const candidates: MatchCandidate[] = [];

  for (const spec of Object.values(registry.specifications)) {
    const score = scoreCandidate(spec, sourceGroup, sourceLabel, value, productDomain);
    if (score <= 0) continue;
    candidates.push({
      specId: spec.id,
      score,
      name: spec.name || sourceLabel,
      domain: spec.domain || spec.id.split(".")[0] || "",
      displayGroup: spec.display?.group || spec.domain || "Specifications",
      unit: spec.unit,
    });
  }

  if (ambiguousLabel && candidates.length > 1) {
    for (const c of candidates) c.score = Math.min(c.score, SCORE_AMBIGUOUS);
  } else if (candidates.length > 1 && candidates[0].score === candidates[1].score && productDomain) {
    const topScore = candidates[0].score;
    const domainMatches = candidates.filter((c) => c.score === topScore && c.domain === productDomain);
    if (domainMatches.length === 1) {
      const match = domainMatches[0];
      const rest = candidates.filter((c) => c !== match);
      candidates.splice(0, candidates.length, match, ...rest);
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.specId.localeCompare(b.specId));
  return candidates;
}

export function matchSpecification(
  sourceGroup: string,
  sourceLabel: string,
  value: string,
  productDomain?: string,
): { match: MatchCandidate | null; candidates: MatchCandidate[]; reason: SpecMatchConfidence } {
  const candidates = findCandidates(sourceGroup, sourceLabel, value, productDomain);
  if (!candidates.length) return { match: null, candidates: [], reason: "UNMAPPED" };

  const top = candidates[0];
  const tied = candidates.filter((c) => c.score === top.score && c.specId !== top.specId);
  const { assign, reason } = shouldAssign(top.score, 1 + tied.length);
  if (!assign) return { match: null, candidates, reason };
  return { match: top, candidates, reason };
}
