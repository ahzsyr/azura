import type { SearchMode } from "@/features/search-framework/types";

export type SearchModeExecution = {
  useFullText: boolean;
  useLike: boolean;
  /** When true, LIKE is skipped if FULLTEXT returned rows (hybrid + performance). */
  skipLikeWhenFullText: boolean;
};

/** Map admin Search Mode to query execution strategy. */
export function resolveSearchModeExecution(
  mode: SearchMode,
  opts: { useFullTextEligible: boolean; skipLikeWhenFullTextSetting: boolean }
): SearchModeExecution {
  switch (mode) {
    case "basic":
      return { useFullText: false, useLike: true, skipLikeWhenFullText: false };
    case "advanced":
      return {
        useFullText: opts.useFullTextEligible,
        useLike: !opts.useFullTextEligible,
        skipLikeWhenFullText: false,
      };
    case "fuzzy":
      return { useFullText: false, useLike: true, skipLikeWhenFullText: false };
    case "hybrid":
    default:
      return {
        useFullText: opts.useFullTextEligible,
        useLike: true,
        skipLikeWhenFullText: opts.skipLikeWhenFullTextSetting,
      };
  }
}
