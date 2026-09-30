export type SearchSemanticsContract = {
  schemaVersion: number;
  tokenizationVersion: number;
  facetSchemaVersion: number;
  rankingVersion: number;
  tokenNormalization: "lowercase-alphanumeric";
  stopWords: "none";
  minTokenLength: number;
  synonymExpansion: "query-time";
  phraseBehavior: "tokenized";
  prefixBehavior: {
    enabled: boolean;
    minPrefixLength: number;
    maxPrefixLength: number;
  };
  localeRules: "unicode-letters-numbers";
};

export const SEARCH_SEMANTICS_CONTRACT: SearchSemanticsContract = {
  schemaVersion: 2,
  tokenizationVersion: 2,
  facetSchemaVersion: 1,
  rankingVersion: 1,
  tokenNormalization: "lowercase-alphanumeric",
  stopWords: "none",
  minTokenLength: 2,
  synonymExpansion: "query-time",
  phraseBehavior: "tokenized",
  prefixBehavior: {
    enabled: true,
    minPrefixLength: 2,
    maxPrefixLength: 8,
  },
  localeRules: "unicode-letters-numbers",
};

export const SEARCH_SEMANTIC_VERSION_KEY = [
  `schema:${SEARCH_SEMANTICS_CONTRACT.schemaVersion}`,
  `token:${SEARCH_SEMANTICS_CONTRACT.tokenizationVersion}`,
  `facet:${SEARCH_SEMANTICS_CONTRACT.facetSchemaVersion}`,
  `ranking:${SEARCH_SEMANTICS_CONTRACT.rankingVersion}`,
].join("|");

export type TokenizeForSearchOptions = {
  minTokenLength?: number;
  includePrefixes?: boolean;
  minPrefixLength?: number;
  maxPrefixLength?: number;
};

const TOKEN_BOUNDARY_RE = /[^\p{L}\p{N}]+/gu;
const TOKENIZER_VERSION =
  process.env.NEXT_PUBLIC_TOKENIZER_VERSION ??
  process.env.TOKENIZER_VERSION ??
  "contract_v1";

function legacyTokenizeForSearch(input: string, minTokenLength: number): string[] {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^-\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= minTokenLength);
}

export function tokenizeForSearch(
  input: string,
  options?: TokenizeForSearchOptions,
): string[] {
  const minTokenLength = options?.minTokenLength ?? SEARCH_SEMANTICS_CONTRACT.minTokenLength;
  if (TOKENIZER_VERSION === "legacy") {
    return [...new Set(legacyTokenizeForSearch(input, minTokenLength))];
  }
  const out = new Set<string>();
  const tokens = input
    .trim()
    .toLowerCase()
    .replace(TOKEN_BOUNDARY_RE, " ")
    .split(/\s+/)
    .filter((token) => token.length >= minTokenLength);

  for (const token of tokens) {
    out.add(token);
    if (!options?.includePrefixes) continue;

    const minPrefixLength =
      options.minPrefixLength ?? SEARCH_SEMANTICS_CONTRACT.prefixBehavior.minPrefixLength;
    const maxPrefixLength =
      options.maxPrefixLength ?? SEARCH_SEMANTICS_CONTRACT.prefixBehavior.maxPrefixLength;
    const cappedLength = Math.min(token.length - 1, maxPrefixLength);
    for (let len = minPrefixLength; len <= cappedLength; len++) {
      if (len >= minTokenLength) out.add(token.slice(0, len));
    }
  }

  return [...out];
}
