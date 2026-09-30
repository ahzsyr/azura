export type LocalizedSlugRowRef = { id: string; entityId: string };

export type LocalizedSlugUpsertPlan =
  | { type: "noop" }
  | { type: "create" }
  | { type: "update-slug"; id: string }
  | { type: "reassign"; id: string }
  | { type: "takeover"; keepId: string; deleteId: string };

/**
 * Prisma LocalizedSlug has two unique keys. Upserting only on
 * (entityType, entityId, locale) can fail on (entityType, slug, locale)
 * when a stale/other row already owns the slug.
 */
export function planLocalizedSlugUpsert(
  entityId: string,
  byEntity: LocalizedSlugRowRef | null,
  bySlug: LocalizedSlugRowRef | null,
): LocalizedSlugUpsertPlan {
  if (byEntity && bySlug && byEntity.id === bySlug.id) return { type: "noop" };
  if (byEntity && bySlug) {
    return { type: "takeover", keepId: bySlug.id, deleteId: byEntity.id };
  }
  if (byEntity) return { type: "update-slug", id: byEntity.id };
  if (bySlug) return { type: "reassign", id: bySlug.id };
  return { type: "create" };
}
