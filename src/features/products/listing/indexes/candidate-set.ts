/**
 * Sorted unique record-index sets for listing query execution.
 * Representation stays simple (number[] / Uint32Array) so we can swap to bitmaps later.
 */

export type CandidateSet = number[];

export function emptyCandidateSet(): CandidateSet {
  return [];
}

export function candidateFromSorted(ids: Iterable<number>): CandidateSet {
  const unique = [...new Set(ids)].filter((n) => Number.isFinite(n) && n >= 0);
  unique.sort((a, b) => a - b);
  return unique;
}

export function candidateFromIndices(count: number): CandidateSet {
  if (count <= 0) return [];
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) out[i] = i;
  return out;
}

export function candidateSize(set: CandidateSet | null | undefined): number {
  return set?.length ?? 0;
}

export function candidateContains(set: CandidateSet, id: number): boolean {
  let lo = 0;
  let hi = set.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = set[mid];
    if (v === id) return true;
    if (v < id) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

export function unionCandidateSets(...sets: Array<CandidateSet | null | undefined>): CandidateSet {
  const usable = sets.filter((s): s is CandidateSet => Boolean(s && s.length));
  if (usable.length === 0) return [];
  if (usable.length === 1) return usable[0].slice();
  const out = new Set<number>();
  for (const set of usable) {
    for (const id of set) out.add(id);
  }
  return candidateFromSorted(out);
}

export function intersectCandidateSets(...sets: Array<CandidateSet | null | undefined>): CandidateSet {
  const usable = sets.filter((s): s is CandidateSet => s != null);
  if (usable.length === 0) return [];
  // null-as-universe is not used here; callers pass all-ids when needed.
  const sorted = [...usable].sort((a, b) => a.length - b.length);
  let result = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const other = sorted[i];
    const otherSet = new Set(other);
    result = result.filter((id) => otherSet.has(id));
    if (result.length === 0) return [];
  }
  return result.slice();
}

export function differenceCandidateSets(a: CandidateSet, b: CandidateSet): CandidateSet {
  if (!a.length) return [];
  if (!b.length) return a.slice();
  const exclude = new Set(b);
  return a.filter((id) => !exclude.has(id));
}

export function intersectionSize(a: CandidateSet, b: CandidateSet): number {
  if (!a.length || !b.length) return 0;
  const [small, large] = a.length <= b.length ? [a, b] : [b, a];
  const largeSet = new Set(large);
  let n = 0;
  for (const id of small) {
    if (largeSet.has(id)) n += 1;
  }
  return n;
}

export function recordsFromCandidateSet<T>(records: T[], candidates: CandidateSet): T[] {
  const out: T[] = [];
  for (const id of candidates) {
    const record = records[id];
    if (record !== undefined) out.push(record);
  }
  return out;
}

export function candidateSetFromSlugSet(
  records: Array<{ slug: string }>,
  slugs: Set<string> | null,
): CandidateSet | null {
  if (!slugs) return null;
  const out: number[] = [];
  for (let i = 0; i < records.length; i++) {
    if (slugs.has(records[i].slug)) out.push(i);
  }
  return out;
}
