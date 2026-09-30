/**
 * @deprecated Import from `@/capabilities/search/core/text` instead.
 * Re-export shim for backward compatibility during migration.
 */
export {
  sanitizeQuery,
  normalizeToken,
  tokenize,
  toBooleanModeQuery,
  normalizeForMatch,
  levenshtein,
  typoScore,
  fuzzySimilarity,
  partialMatchScore,
  multiKeywordScore,
  exactMatchBoost,
  excerpt,
  highlightMatches,
} from "@/capabilities/search/core/text";
