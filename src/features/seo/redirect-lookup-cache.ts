type RedirectLookupEntry = { toPath: string; type: string };

type RedirectLookupCache = {
  paths: Map<string, RedirectLookupEntry>;
  at: number;
};

let cache: RedirectLookupCache | null = null;

export function readRedirectLookupCache(maxAgeMs: number): Map<string, RedirectLookupEntry> | null {
  if (!cache) return null;
  if (Date.now() - cache.at > maxAgeMs) return null;
  return cache.paths;
}

export function writeRedirectLookupCache(paths: Map<string, RedirectLookupEntry>): void {
  cache = { paths, at: Date.now() };
}

/** Drop the in-process lookup cache so the next request reads published rows. */
export function clearRedirectLookupCache(): void {
  cache = null;
}
