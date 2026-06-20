/**
 * @deprecated Import from `@/features/search/core/text` instead.
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
} from "@/features/search/core/text";
