/**
 * Locale fallback chain resolution.
 * Supports hierarchical locales: fr-CA → fr → en
 */
import type { PublicLocale } from "@/i18n/locale-config";

export function resolveLocaleCandidates(
  code: string,
  enabledLocales: PublicLocale[],
  defaultCode?: string
): string[] {
  const normalized = code.toLowerCase();
  const enabled = new Set(enabledLocales.map((l) => l.code.toLowerCase()));
  const chain: string[] = [];

  function add(c: string) {
    const lower = c.toLowerCase();
    if (enabled.has(lower) && !chain.includes(lower)) {
      chain.push(lower);
    }
  }

  add(normalized);

  if (normalized.includes("-")) {
    const base = normalized.split("-")[0];
    add(base);
  }

  const def =
    defaultCode?.toLowerCase() ??
    enabledLocales.find((l) => l.isDefault)?.code.toLowerCase() ??
    "en";
  add(def);

  for (const locale of enabledLocales) {
    add(locale.code);
  }

  return chain;
}

export function resolveWithFallback<T>(
  map: Map<string, T> | Record<string, T>,
  code: string,
  enabledLocales: PublicLocale[],
  defaultCode?: string
): T | undefined {
  const get = (k: string) => (map instanceof Map ? map.get(k) : map[k]);
  for (const candidate of resolveLocaleCandidates(code, enabledLocales, defaultCode)) {
    const value = get(candidate);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}
