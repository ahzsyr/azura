"use client";

const STORAGE_PREFIX = "sm-search";

export type SearchHistoryEntry = {
  q: string;
  at: string;
  urlPath?: string;
  title?: string;
};

function storageKey(locale: string, kind: "history" | "recent"): string {
  return `${STORAGE_PREFIX}:${kind}:${locale}`;
}

function readEntries(key: string): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SearchHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(key: string, entries: SearchHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

export function getSearchHistory(locale: string, limit: number): SearchHistoryEntry[] {
  return readEntries(storageKey(locale, "history")).slice(0, limit);
}

export function getRecentSearches(locale: string, limit: number): string[] {
  const recent = readEntries(storageKey(locale, "recent"));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of recent) {
    const q = entry.q.trim();
    if (!q || seen.has(q.toLowerCase())) continue;
    seen.add(q.toLowerCase());
    out.push(q);
    if (out.length >= limit) break;
  }
  return out;
}

export function pushSearchHistory(
  locale: string,
  q: string,
  options: { historyLimit: number; recentLimit: number; urlPath?: string; title?: string }
): void {
  const trimmed = q.trim();
  if (trimmed.length < 1) return;
  const at = new Date().toISOString();
  const entry: SearchHistoryEntry = { q: trimmed, at, urlPath: options.urlPath, title: options.title };

  const historyKey = storageKey(locale, "history");
  const history = readEntries(historyKey).filter(
    (e) => e.q.toLowerCase() !== trimmed.toLowerCase()
  );
  history.unshift(entry);
  writeEntries(historyKey, history.slice(0, options.historyLimit));

  const recentKey = storageKey(locale, "recent");
  const recent = readEntries(recentKey).filter(
    (e) => e.q.toLowerCase() !== trimmed.toLowerCase()
  );
  recent.unshift(entry);
  writeEntries(recentKey, recent.slice(0, options.recentLimit));
}

export function removeSearchHistoryEntry(locale: string, q: string): void {
  const lower = q.toLowerCase();
  for (const kind of ["history", "recent"] as const) {
    const key = storageKey(locale, kind);
    writeEntries(
      key,
      readEntries(key).filter((e) => e.q.toLowerCase() !== lower)
    );
  }
}

export function clearSearchHistory(locale: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(locale, "history"));
  localStorage.removeItem(storageKey(locale, "recent"));
}
