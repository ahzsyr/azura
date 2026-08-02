import type { Collection } from "./types";

export type CollectionTrailItem = { name: string; href: string };

export function collectionMapFromList(cols: Collection[]): Map<string, Collection> {
  return new Map(cols.map((c) => [c.slug, c]));
}

export function getCollectionAncestorChain(
  slug: string,
  bySlug: Map<string, Collection>,
): Collection[] {
  const up: Collection[] = [];
  const seen = new Set<string>();
  let cur: Collection | undefined = bySlug.get(slug);
  while (cur) {
    if (seen.has(cur.slug)) break;
    seen.add(cur.slug);
    up.push(cur);
    const p = cur.parentSlug?.trim();
    cur = p && bySlug.has(p) ? bySlug.get(p) : undefined;
  }
  return up.reverse();
}

export function buildCollectionTrail(
  localeUrlPrefix: string,
  slug: string,
  bySlug: Map<string, Collection>,
): CollectionTrailItem[] {
  const prefix = localeUrlPrefix.replace(/^\/+|\/+$/g, "");
  const base = `/${prefix}/collections`;
  return getCollectionAncestorChain(slug, bySlug).map((c) => ({
    name: c.name,
    href: `${base}/${c.slug}`,
  }));
}

export function buildRootCollectionTrail(
  slug: string,
  bySlug: Map<string, Collection>,
): CollectionTrailItem[] {
  return getCollectionAncestorChain(slug, bySlug).map((c) => ({
    name: c.name,
    href: `/collections/${c.slug}`,
  }));
}

function trimImageUrl(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

/** Inherit cover/icon from nearest ancestor when missing on the collection row. */
export function resolveCollectionImages(
  col: Collection,
  bySlug: Map<string, Collection>,
): { coverImage?: string; iconImage?: string } {
  let coverImage = trimImageUrl(col.coverImage);
  let iconImage = trimImageUrl(col.iconImage);
  if (coverImage && iconImage) return { coverImage, iconImage };

  const seen = new Set<string>([col.slug]);
  let cur = col.parentSlug?.trim();
  while (cur && bySlug.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    const parent = bySlug.get(cur)!;
    if (!coverImage) coverImage = trimImageUrl(parent.coverImage);
    if (!iconImage) iconImage = trimImageUrl(parent.iconImage);
    if (coverImage && iconImage) break;
    cur = parent.parentSlug?.trim();
  }

  return { coverImage, iconImage };
}

type HierarchyNavOpts = { includeHidden?: boolean };

function isNavVisible(c: Collection, includeHidden?: boolean): boolean {
  return includeHidden === true || c.visible !== false;
}

/** Direct children, sorted by name. Visible only unless includeHidden. */
export function getChildCollections(
  parentSlug: string,
  all: Collection[],
  opts?: HierarchyNavOpts,
): Collection[] {
  const p = parentSlug.trim();
  return all
    .filter((c) => isNavVisible(c, opts?.includeHidden) && (c.parentSlug ?? "").trim() === p)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

/** Root collections (no parent in set), sorted by name. Visible only unless includeHidden. */
export function getRootCollections(all: Collection[], opts?: HierarchyNavOpts): Collection[] {
  const bySlug = collectionMapFromList(all);
  return all
    .filter((c) => isNavVisible(c, opts?.includeHidden))
    .filter((c) => !c.parentSlug?.trim() || !bySlug.has(c.parentSlug.trim()))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

/** Root-to-leaf slug path for hierarchy chrome (empty when scope is unknown). */
export function parseCollectionScopePath(
  scopeSlug: string,
  bySlug: Map<string, Collection>,
): string[] {
  const s = scopeSlug.trim();
  if (!s || !bySlug.has(s)) return [];
  return getCollectionAncestorChain(s, bySlug).map((c) => c.slug);
}

export function isDescendantOrSelf(
  slug: string,
  ancestorSlug: string,
  bySlug: Map<string, Collection>,
): boolean {
  if (slug === ancestorSlug) return true;
  const seen = new Set<string>();
  let cur: Collection | undefined = bySlug.get(slug);
  while (cur) {
    if (cur.slug === ancestorSlug) return true;
    if (seen.has(cur.slug)) break;
    seen.add(cur.slug);
    const p = cur.parentSlug?.trim();
    cur = p && bySlug.has(p) ? bySlug.get(p) : undefined;
  }
  return false;
}