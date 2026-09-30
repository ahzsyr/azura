import type { ImpactSimulation, RiskLevel } from "../operations/types";

export function simulateSearchImpact(input: {
  currentTitle?: string;
  proposedTitle?: string;
  currentDescription?: string;
  proposedDescription?: string;
  schemaValid?: boolean;
  entityConfidenceBefore?: number;
  entityConfidenceAfter?: number;
  addsInternalLinks?: boolean;
  improvesKnowledgeSignals?: boolean;
}): ImpactSimulation {
  const currentLen = input.currentTitle?.length ?? 0;
  const proposedLen = input.proposedTitle?.length ?? 0;
  let ctr = 0;
  if (proposedLen > 0 && proposedLen <= 60 && (currentLen === 0 || currentLen > 60 || currentLen < 30)) {
    ctr += 3.5;
  }
  if ((input.proposedDescription?.length ?? 0) >= 120 && (input.currentDescription?.length ?? 0) < 80) {
    ctr += 1.5;
  }
  if (input.addsInternalLinks) ctr += 0.5;

  const entityBefore = input.entityConfidenceBefore ?? 70;
  const entityAfter = input.entityConfidenceAfter ?? entityBefore + (input.improvesKnowledgeSignals ? 2 : 0);
  const entityDelta = entityAfter - entityBefore;

  let risk: RiskLevel = "safe";
  if (proposedLen > 70 || (input.proposedDescription?.length ?? 0) > 320) risk = "moderate";
  if (input.schemaValid === false) risk = "high";

  const richResultsEffect =
    input.schemaValid === false ? "regressed" : input.schemaValid ? "no_change" : "no_change";
  const knowledgeImpact = input.improvesKnowledgeSignals
    ? "improved"
    : entityDelta < 0
      ? "regressed"
      : "no_change";

  return {
    currentTitle: input.currentTitle,
    proposedTitle: input.proposedTitle,
    predictedCtrDeltaPct: Math.round(ctr * 10) / 10,
    richResultsEffect,
    schemaValid: input.schemaValid !== false,
    knowledgeImpact,
    entityConfidenceDeltaPct: Math.round(entityDelta * 10) / 10,
    internalLinksImpact: input.addsInternalLinks ? "improved" : "no_change",
    risk,
    summary:
      ctr > 0
        ? `Predicted CTR uplift ~${ctr.toFixed(1)}% with ${risk} risk.`
        : `No significant CTR change predicted (${risk} risk).`,
  };
}
