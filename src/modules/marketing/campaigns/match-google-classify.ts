export type GoogleMatchKind =
  | "existing"
  | "exact_name"
  | "internal_id"
  | "tracking_template"
  | "fuzzy"
  | "ambiguous";

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function fuzzyGoogleNameScore(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / Math.max(ta.size, tb.size);
}

/** Pure helper for unit tests and suggestion UI. */
export function classifyGoogleMatch(input: {
  googleName: string;
  internals: Array<{ id: string; name: string; internalId: string }>;
  alreadyBound?: boolean;
}): { kind: GoogleMatchKind; confidence: number; internalCampaignId: string | null } {
  if (input.alreadyBound) {
    return { kind: "existing", confidence: 1, internalCampaignId: null };
  }
  const exact = input.internals.filter(
    (c) => normalizeName(c.name) === normalizeName(input.googleName),
  );
  if (exact.length === 1) {
    return { kind: "exact_name", confidence: 1, internalCampaignId: exact[0]!.id };
  }
  if (exact.length > 1) {
    return { kind: "ambiguous", confidence: 0.9, internalCampaignId: null };
  }
  const byId = input.internals.filter(
    (c) => normalizeName(input.googleName) === normalizeName(c.internalId),
  );
  if (byId.length === 1) {
    return { kind: "internal_id", confidence: 0.95, internalCampaignId: byId[0]!.id };
  }
  let best: { id: string; score: number } | null = null;
  for (const c of input.internals) {
    const score = fuzzyGoogleNameScore(input.googleName, c.name);
    if (score >= 0.75 && (!best || score > best.score)) best = { id: c.id, score };
  }
  if (best) {
    return { kind: "fuzzy", confidence: best.score, internalCampaignId: best.id };
  }
  return { kind: "ambiguous", confidence: 0, internalCampaignId: null };
}

export { normalizeName as normalizeGoogleCampaignName };
