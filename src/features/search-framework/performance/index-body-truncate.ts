import { SEARCH_PERF_LIMITS } from "@/features/search-framework/performance/search-performance-limits";

export function truncateIndexBody(text: string, maxChars: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
}

export function buildIndexExcerpt(body: string, maxChars = SEARCH_PERF_LIMITS.maxSnippetSourceChars): string {
  return truncateIndexBody(body, maxChars);
}
