import { humanizeSlug } from "@/capabilities/search/lib/humanize-slug";

/** Resolve a non-empty index title with slug fallback and optional warning. */
export function resolveIndexTitle(
  localizedTitle: string,
  fallbackSlug: string,
  context?: { entityType?: string; entityId?: string; locale?: string }
): string {
  const trimmed = localizedTitle.trim();
  if (trimmed) return trimmed;
  const fallback = humanizeSlug(fallbackSlug);
  if (context?.entityId) {
    console.warn(
      `[search-index] Empty title for ${context.entityType ?? "entity"} ${context.entityId} locale=${context.locale ?? "?"} — using slug fallback "${fallback}"`
    );
  }
  return fallback;
}
