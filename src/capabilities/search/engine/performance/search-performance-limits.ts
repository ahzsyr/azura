/** Hard caps — admin settings may lower these further. */
export const SEARCH_PERF_LIMITS = {
  maxRetrievalCandidates: 120,
  maxIndexBodyChars: 12_000,
  maxSnippetSourceChars: 600,
  queryCacheTtlSecMax: 300,
  indexConcurrency: 8,
  defaultQueryCacheTtlSec: 45,
} as const;
