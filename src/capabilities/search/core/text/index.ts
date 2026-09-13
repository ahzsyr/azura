export {
  sanitizeQuery,
  normalizeToken,
  tokenize,
  toBooleanModeQuery,
  normalizeForMatch,
} from "./sanitize";

export {
  SEARCH_SEMANTICS_CONTRACT,
  SEARCH_SEMANTIC_VERSION_KEY,
  tokenizeForSearch,
} from "./semantics";
export type {
  SearchSemanticsContract,
  TokenizeForSearchOptions,
} from "./semantics";

export {
  levenshtein,
  typoScore,
  fuzzySimilarity,
  partialMatchScore,
  multiKeywordScore,
  exactMatchBoost,
} from "./fuzzy";

export { excerpt, highlightMatches } from "./excerpt";

export {
  flattenJsonToText,
  stringifyIndexValue,
  normalizeTags,
} from "./index-time";
