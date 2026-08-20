/**
 * Listing-scoped search: tokenize, prefix, score, fuzzy fallback.
 * Does not replace the global search capability.
 */

import type { ProductListingRecord } from "../types";
import { candidateFromSorted, type CandidateSet } from "../indexes/candidate-set";

export type ListingSearchMatch = {
  recordId: number;
  score: number;
};

const SCORE = {
  exactSku: 1000,
  exactTitle: 900,
  titlePrefix: 800,
  titleToken: 700,
  brand: 500,
  tag: 400,
  slug: 350,
  searchText: 200,
  fuzzy: 100,
} as const;

export function tokenizeListingQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Whole-phrase match with alphanumeric word boundaries (case-insensitive). */
export function recordMatchesExactPhrase(text: string, phrase: string): boolean {
  const ql = phrase.trim().toLowerCase();
  if (!ql) return true;
  const haystack = text.toLowerCase();
  const escaped = ql.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").test(haystack);
}

export function listingRecordMatchesExactPhrase(
  record: ProductListingRecord,
  phrase: string,
): boolean {
  return recordMatchesExactPhrase(record.searchText, phrase);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

export function scoreSearchMatch(record: ProductListingRecord, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const tokens = tokenizeListingQuery(q);
  const name = (record.name ?? "").toLowerCase();
  const slug = (record.slug ?? "").toLowerCase();
  const brand = (record.brand ?? "").toLowerCase();
  const mpn = (record.mpn ?? "").toLowerCase();
  const searchText = (record.searchText ?? "").toLowerCase();
  const tags = (record.tags ?? []).map((t) => t.toLowerCase());

  let score = 0;
  if (mpn && (mpn === q || tokens.includes(mpn))) score = Math.max(score, SCORE.exactSku);
  if (name === q) score = Math.max(score, SCORE.exactTitle);
  if (name.startsWith(q) || tokens.some((t) => name.startsWith(t))) {
    score = Math.max(score, SCORE.titlePrefix);
  }
  if (tokens.some((t) => name.split(/\s+/).includes(t))) {
    score = Math.max(score, SCORE.titleToken);
  }
  if (brand && (brand === q || tokens.includes(brand) || brand.includes(q))) {
    score = Math.max(score, SCORE.brand);
  }
  if (tags.some((t) => t === q || tokens.includes(t) || t.includes(q))) {
    score = Math.max(score, SCORE.tag);
  }
  if (slug.includes(q) || tokens.some((t) => slug.includes(t))) {
    score = Math.max(score, SCORE.slug);
  }
  if (searchText.includes(q) || tokens.every((t) => searchText.includes(t))) {
    score = Math.max(score, SCORE.searchText);
  }
  return score;
}

export type ListingSearchIndex = {
  /** token → record ids */
  tokens: Map<string, CandidateSet>;
  /** sorted unique tokens for prefix / fuzzy */
  tokenList: string[];
};

export function buildListingSearchIndex(records: ProductListingRecord[]): ListingSearchIndex {
  const map = new Map<string, Set<number>>();
  const add = (token: string, id: number) => {
    if (!token) return;
    const bucket = map.get(token) ?? new Set<number>();
    bucket.add(id);
    map.set(token, bucket);
  };

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const parts = [
      r.name,
      r.slug,
      r.brand,
      r.mpn,
      ...(r.tags ?? []),
      r.category,
      ...(r.categories ?? []),
    ];
    for (const part of parts) {
      for (const token of tokenizeListingQuery(String(part ?? ""))) {
        add(token, i);
      }
    }
  }

  const tokens = new Map<string, CandidateSet>();
  for (const [token, ids] of map) {
    tokens.set(token, candidateFromSorted(ids));
  }
  return {
    tokens,
    tokenList: [...tokens.keys()].sort((a, b) => a.localeCompare(b)),
  };
}

function prefixTokenCandidates(index: ListingSearchIndex, prefix: string): CandidateSet {
  if (prefix.length < 2) return [];
  const ids = new Set<number>();
  for (const token of index.tokenList) {
    if (token.startsWith(prefix)) {
      for (const id of index.tokens.get(token) ?? []) ids.add(id);
    }
  }
  return candidateFromSorted(ids);
}

function fuzzyTokenCandidates(index: ListingSearchIndex, token: string, maxDist = 1): CandidateSet {
  if (token.length < 3) return [];
  const ids = new Set<number>();
  for (const candidate of index.tokenList) {
    if (Math.abs(candidate.length - token.length) > maxDist) continue;
    if (levenshtein(token, candidate) <= maxDist) {
      for (const id of index.tokens.get(candidate) ?? []) ids.add(id);
    }
  }
  return candidateFromSorted(ids);
}

/**
 * Generate search candidate ids. Intersects token postings; uses prefix then fuzzy fallback.
 */
export function searchListingCandidates(
  index: ListingSearchIndex,
  query: string,
  options?: { exact?: boolean },
): { candidates: CandidateSet; mode: "token" | "prefix" | "fuzzy" | "empty" | "exact" } {
  const tokens = tokenizeListingQuery(query);
  if (!tokens.length) return { candidates: [], mode: "empty" };
  if (options?.exact) {
    return { candidates: [], mode: "exact" };
  }

  let result: CandidateSet | null = null;
  let mode: "token" | "prefix" | "fuzzy" | "empty" = "token";

  for (const token of tokens) {
    let posting = index.tokens.get(token) ?? [];
    if (!posting.length) {
      posting = prefixTokenCandidates(index, token);
      if (posting.length) mode = "prefix";
    }
    if (!posting.length) {
      posting = fuzzyTokenCandidates(index, token);
      if (posting.length) mode = "fuzzy";
    }
    if (!posting.length) {
      return { candidates: [], mode: "empty" };
    }
    result =
      result == null
        ? posting
        : result.filter((id) => {
            // binary-ish via Set
            return posting.includes(id);
          });
    if (result && posting.length) {
      const set = new Set(posting);
      result = result.filter((id) => set.has(id));
    }
    if (!result.length) return { candidates: [], mode };
  }

  return { candidates: result ?? [], mode };
}

export function rankListingSearchResults(
  records: ProductListingRecord[],
  query: string,
  options?: { exact?: boolean },
): ProductListingRecord[] {
  const q = query.trim();
  if (!q) return records;
  if (options?.exact) {
    return records
      .filter((record) => listingRecordMatchesExactPhrase(record, q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...records]
    .map((record) => ({ record, score: scoreSearchMatch(record, q) }))
    .filter((row) => row.score > 0 || recordMatchesSubstring(row.record, q))
    .sort((a, b) => b.score - a.score || a.record.name.localeCompare(b.record.name))
    .map((row) => row.record);
}

function recordMatchesSubstring(record: ProductListingRecord, q: string): boolean {
  const ql = q.trim().toLowerCase();
  return record.searchText.includes(ql);
}

export function searchSlugHitsFromCandidates(
  records: ProductListingRecord[],
  candidates: CandidateSet,
): Set<string> {
  const out = new Set<string>();
  for (const id of candidates) {
    const r = records[id];
    if (r) out.add(r.slug);
  }
  return out;
}
