export type SearchLatencySurface = "builder" | "page" | "modal" | "unknown";

function readPublicFlag(name: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") {
    const raw = process.env[name]?.trim().toLowerCase();
    if (raw == null || raw === "") return defaultValue;
    return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
  }
  const raw = (process.env[name] ?? "").trim().toLowerCase();
  if (raw === "") return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Master switch for TanStack Query search latency optimizations. */
export function isSearchLatencyEnabled(defaultValue = true): boolean {
  return readPublicFlag("NEXT_PUBLIC_SEARCH_LATENCY_ENABLED", defaultValue);
}

function surfaceFlag(surface: SearchLatencySurface): boolean {
  if (surface === "unknown") return false;
  const envKey =
    surface === "builder"
      ? "NEXT_PUBLIC_SEARCH_LATENCY_BUILDER"
      : surface === "page"
        ? "NEXT_PUBLIC_SEARCH_LATENCY_PAGE"
        : "NEXT_PUBLIC_SEARCH_LATENCY_MODAL";
  return readPublicFlag(envKey, true);
}

/** Per-surface rollout gate (builder → page → modal). */
export function isSearchLatencyEnabledForSurface(surface: SearchLatencySurface): boolean {
  if (!isSearchLatencyEnabled()) return false;
  return surfaceFlag(surface);
}

export function isSearchPrefetchEnabled(defaultValue = true): boolean {
  return readPublicFlag("NEXT_PUBLIC_SEARCH_PREFETCH_ENABLED", defaultValue);
}

export function isSearchWarmCacheEnabled(defaultValue = true): boolean {
  return readPublicFlag("NEXT_PUBLIC_SEARCH_WARM_CACHE_ENABLED", defaultValue);
}

export function isSearchVirtualizationEnabled(defaultValue = true): boolean {
  return readPublicFlag("NEXT_PUBLIC_SEARCH_VIRTUALIZATION_ENABLED", defaultValue);
}
