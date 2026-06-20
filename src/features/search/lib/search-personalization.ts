"use client";

import { getRecentlyViewed } from "@/features/discovery-blocks/lib/recently-viewed.storage";

type PersonalizableHit = {
  entityType: string;
  entityId?: string;
  id?: string;
};

/** Lightweight client-side boost: recently viewed entities float to the top. */
export function applyRecentlyViewedBoost<T extends PersonalizableHit>(
  hits: T[],
  locale: string
): T[] {
  if (!hits.length || typeof window === "undefined") return hits;

  const recentKeys = new Set(
    getRecentlyViewed(locale, 20).map((e) => `${e.entityType}:${e.entityId}`)
  );
  if (!recentKeys.size) return hits;

  const score = (h: PersonalizableHit) =>
    recentKeys.has(`${h.entityType}:${h.entityId ?? h.id}`) ? 1 : 0;

  return [...hits].sort((a, b) => score(b) - score(a));
}
