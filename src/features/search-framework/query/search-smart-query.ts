import { tokenize } from "@/features/search/search-text";
import type { ResolvedSearchSmartConfig } from "@/features/search/settings/resolve-search-smart-config";

const NL_PREFIX =
  /^(?:please\s+)?(?:can you\s+)?(?:show me\s+|find\s+|search for\s+|looking for\s+|i need\s+|where is\s+|what is\s+|articles? about\s+|posts? about\s+|pages? about\s+)/i;

const NL_SUFFIX = /(?:\s+please|\s+thanks?)$/i;

export type SmartQueryAnalysis = {
  phraseQuery: string;
  tokens: string[];
  expandedTokens: string[];
  expandedQuery: string;
};

function normalizeToken(token: string): string {
  return token
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function parseNaturalLanguageQuery(raw: string, enabled: boolean): string {
  if (!enabled) return raw.trim();
  let q = raw.trim();
  q = q.replace(NL_PREFIX, "").replace(NL_SUFFIX, "").trim();
  return q || raw.trim();
}

export function expandSearchTokens(
  tokens: string[],
  synonymMap: Record<string, string[]>
): string[] {
  const expanded = new Set<string>();
  for (const token of tokens) {
    const norm = normalizeToken(token);
    if (!norm) continue;
    expanded.add(norm);
    for (const syn of synonymMap[norm] ?? []) {
      const s = normalizeToken(syn);
      if (s) expanded.add(s);
    }
  }
  return [...expanded];
}

export function analyzeSmartQuery(
  sanitizedQuery: string,
  config: ResolvedSearchSmartConfig
): SmartQueryAnalysis {
  const phraseQuery = parseNaturalLanguageQuery(
    sanitizedQuery,
    config.naturalLanguageParsing
  );
  const tokens = tokenize(phraseQuery);
  const expandedTokens = config.enableSynonyms
    ? expandSearchTokens(tokens, config.synonymMap)
    : [...tokens];
  const expandedQuery = expandedTokens.join(" ");

  return {
    phraseQuery,
    tokens,
    expandedTokens,
    expandedQuery: expandedQuery || phraseQuery,
  };
}
