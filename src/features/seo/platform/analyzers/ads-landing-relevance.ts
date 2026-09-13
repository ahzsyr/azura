const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "with",
  "from",
  "by",
  "campaign",
  "ad",
  "group",
  "ads",
]);

export function tokenizeAdsLabel(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export function adsLandingRelevanceScore(input: {
  campaignName?: string | null;
  adGroupName?: string | null;
  title?: string | null;
  h1?: string | null;
}): { score: number; overlap: string[]; tokens: string[] } {
  const adTokens = [
    ...tokenizeAdsLabel(input.campaignName ?? ""),
    ...tokenizeAdsLabel(input.adGroupName ?? ""),
  ];
  const uniqueAdTokens = [...new Set(adTokens)];
  const pageTokens = new Set([
    ...tokenizeAdsLabel(input.title ?? ""),
    ...tokenizeAdsLabel(input.h1 ?? ""),
  ]);
  const overlap = uniqueAdTokens.filter((token) => pageTokens.has(token));
  if (uniqueAdTokens.length === 0) {
    return { score: 1, overlap: [], tokens: [] };
  }
  return {
    score: overlap.length / uniqueAdTokens.length,
    overlap,
    tokens: uniqueAdTokens,
  };
}

export const ADS_LANDING_RELEVANCE_THRESHOLD = 0.25;
