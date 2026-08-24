import type { CatalogInteractiveRecord } from "./interactive-records";

export type ClientSearchIndex = {
  strategy: "scan" | "token";
  query(q: string): Set<string> | null;
};

function tokenizeQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .replace(/[^-\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function buildTokenStrategy(records: CatalogInteractiveRecord[]): ClientSearchIndex {
  const tokenToSlugs = new Map<string, Set<string>>();
  for (const record of records) {
    for (const token of record.searchTokens) {
      const bucket = tokenToSlugs.get(token) ?? new Set<string>();
      bucket.add(record.slug);
      tokenToSlugs.set(token, bucket);
    }
  }
  return {
    strategy: "token",
    query(q: string): Set<string> | null {
      const tokens = tokenizeQuery(q);
      if (!tokens.length) return null;
      let result: Set<string> | null = null;
      for (const token of tokens) {
        const hits = tokenToSlugs.get(token);
        if (!hits?.size) return null;
        if (!result) {
          result = new Set(hits);
          continue;
        }
        const next = new Set<string>();
        for (const slug of result) {
          if (hits.has(slug)) next.add(slug);
        }
        result = next;
        if (result.size === 0) return null;
      }
      return result;
    },
  };
}

function buildScanStrategy(records: CatalogInteractiveRecord[]): ClientSearchIndex {
  return {
    strategy: "scan",
    query(q: string): Set<string> | null {
      const trimmed = q.trim().toLowerCase();
      if (!trimmed) return null;
      const hits = new Set<string>();
      for (const r of records) {
        if (r.searchText.includes(trimmed) || r.name.toLowerCase().includes(trimmed)) {
          hits.add(r.slug);
        }
      }
      return hits.size ? hits : null;
    },
  };
}

export function createClientSearchIndex(
  records: CatalogInteractiveRecord[],
  options?: { tokenThreshold?: number }
): ClientSearchIndex {
  const threshold = options?.tokenThreshold ?? 10000;
  if (records.length >= threshold) return buildTokenStrategy(records);
  return buildScanStrategy(records);
}

