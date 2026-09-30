const STORAGE_KEY = "azura-saved-searches";

export type SavedSearchEntry = {
  q: string;
  at: number;
  types?: string[];
  facets?: Record<string, string[]>;
};

function storageKey(locale: string): string {
  return `${STORAGE_KEY}:${locale}`;
}

export function getSavedSearches(locale: string): SavedSearchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(locale));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSearchEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function saveSearchQuery(
  locale: string,
  q: string,
  meta?: { types?: string[]; facets?: Record<string, string[]> }
): void {
  if (typeof window === "undefined" || !q.trim()) return;
  const existing = getSavedSearches(locale).filter((e) => e.q !== q.trim());
  const entry: SavedSearchEntry = {
    q: q.trim(),
    at: Date.now(),
    types: meta?.types,
    facets: meta?.facets,
  };
  localStorage.setItem(
    storageKey(locale),
    JSON.stringify([entry, ...existing].slice(0, 12))
  );
}
