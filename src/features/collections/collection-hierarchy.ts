import type { Collection } from "./types";

export type SubcollectionMode = "flat" | "nested" | "roots-only";

export function filterRootCollectionsOnly(cols: Collection[]): Collection[] {
  const slugs = new Set(cols.map((c) => c.slug));
  return cols.filter((c) => !c.parentSlug?.trim() || !slugs.has(c.parentSlug.trim()));
}

export function orderCollectionsHierarchy(cols: Collection[]): Collection[] {
  const filtered = [...cols];
  const bySlug = new Map(filtered.map((c) => [c.slug, c]));
  const visited = new Set<string>();
  const out: Collection[] = [];

  const childrenOf = (slug: string) =>
    filtered
      .filter((c) => (c.parentSlug ?? "").trim() === slug)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  function visit(slug: string) {
    const c = bySlug.get(slug);
    if (!c || visited.has(slug)) return;
    visited.add(slug);
    out.push(c);
    for (const ch of childrenOf(slug)) visit(ch.slug);
  }

  const roots = filtered
    .filter((c) => !c.parentSlug?.trim() || !bySlug.has(c.parentSlug.trim()))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  for (const r of roots) visit(r.slug);
  for (const c of filtered) {
    if (!visited.has(c.slug)) out.push(c);
  }
  return out;
}

export function applySubcollectionMode(
  cols: Collection[],
  mode: SubcollectionMode,
): Collection[] {
  if (mode === "roots-only") return filterRootCollectionsOnly(cols);
  if (mode === "nested") return orderCollectionsHierarchy(cols);
  return cols;
}

export function collectionDepth(col: Collection, bySlug: Map<string, Collection>): number {
  const seen = new Set<string>();
  let d = 0;
  let p = col.parentSlug?.trim();
  while (p && bySlug.has(p) && !seen.has(p)) {
    seen.add(p);
    d += 1;
    p = bySlug.get(p)?.parentSlug?.trim();
    if (d > 64) break;
  }
  return d;
}