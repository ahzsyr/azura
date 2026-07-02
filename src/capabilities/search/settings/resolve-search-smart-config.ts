type SearchFuzzinessLabel = "strict" | "balanced" | "fuzzy";
import { DEFAULT_SEARCH_SYNONYMS } from "@/capabilities/search/settings/search-smart-defaults";
import type { SearchSmartSettings } from "@/capabilities/search/settings/search-smart.schema";

export type ResolvedSearchSmartConfig = {
  enableFuzzy: boolean;
  enablePartialMatch: boolean;
  enableSynonyms: boolean;
  enableMultiKeyword: boolean;
  multiKeywordMode: "all" | "any";
  exactMatchBoost: number;
  typoMaxDistance: number;
  naturalLanguageParsing: boolean;
  synonymMap: Record<string, string[]>;
  semantic: {
    enabled: boolean;
    provider: "none" | "openai";
    hybridWeight: number;
    aiAssistEnabled: boolean;
    model: string;
  };
};

const DEFAULT: ResolvedSearchSmartConfig = {
  enableFuzzy: true,
  enablePartialMatch: true,
  enableSynonyms: true,
  enableMultiKeyword: true,
  multiKeywordMode: "any",
  exactMatchBoost: 8,
  typoMaxDistance: 2,
  naturalLanguageParsing: true,
  synonymMap: { ...DEFAULT_SEARCH_SYNONYMS },
  semantic: {
    enabled: false,
    provider: "none",
    hybridWeight: 0.2,
    aiAssistEnabled: false,
    model: "gpt-4o-mini",
  },
};

let cached: ResolvedSearchSmartConfig | null = null;

function normalizeSynonymMap(
  custom: Record<string, string[]> | undefined
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  for (const [key, vals] of Object.entries(DEFAULT_SEARCH_SYNONYMS)) {
    merged[key.toLowerCase()] = [...vals];
  }
  if (!custom) return merged;
  for (const [key, vals] of Object.entries(custom)) {
    const k = key.toLowerCase().trim();
    if (!k || !Array.isArray(vals)) continue;
    const existing = merged[k] ?? [];
    merged[k] = [...new Set([...existing, ...vals.map((v) => String(v).toLowerCase().trim()).filter(Boolean)])];
  }
  return merged;
}

function typoMaxFromFuzziness(
  label: SearchFuzzinessLabel | undefined,
  numeric: number | undefined,
  override: number | undefined
): number {
  if (typeof override === "number") return Math.min(4, Math.max(0, override));
  if (label === "strict") return 1;
  if (label === "fuzzy") return 3;
  if (typeof numeric === "number") {
    if (numeric <= 0.28) return 1;
    if (numeric >= 0.42) return 3;
    return 2;
  }
  return 2;
}

export function resolveSearchSmartConfig(
  smart: Partial<SearchSmartSettings> | undefined,
  opts?: { fuzziness?: SearchFuzzinessLabel; listingFuzziness?: number }
): ResolvedSearchSmartConfig {
  if (!smart) {
    return {
      ...DEFAULT,
      typoMaxDistance: typoMaxFromFuzziness(opts?.fuzziness, opts?.listingFuzziness, undefined),
    };
  }
  return {
    enableFuzzy: smart.enableFuzzy !== false,
    enablePartialMatch: smart.enablePartialMatch !== false,
    enableSynonyms: smart.enableSynonyms !== false,
    enableMultiKeyword: smart.enableMultiKeyword !== false,
    multiKeywordMode: smart.multiKeywordMode === "all" ? "all" : "any",
    exactMatchBoost:
      typeof smart.exactMatchBoost === "number"
        ? Math.min(30, Math.max(0, smart.exactMatchBoost))
        : DEFAULT.exactMatchBoost,
    typoMaxDistance: typoMaxFromFuzziness(
      opts?.fuzziness,
      opts?.listingFuzziness,
      smart.typoMaxDistance
    ),
    naturalLanguageParsing: smart.naturalLanguageParsing !== false,
    synonymMap: normalizeSynonymMap(smart.synonyms),
    semantic: {
      enabled: smart.semantic?.enabled === true,
      provider:
        smart.semantic?.provider === "openai" ? "openai" : ("none" as const),
      hybridWeight:
        typeof smart.semantic?.hybridWeight === "number"
          ? Math.min(1, Math.max(0, smart.semantic.hybridWeight))
          : DEFAULT.semantic.hybridWeight,
      aiAssistEnabled: smart.semantic?.aiAssistEnabled === true,
      model:
        typeof smart.semantic?.model === "string" && smart.semantic.model.trim()
          ? smart.semantic.model.trim()
          : DEFAULT.semantic.model,
    },
  };
}

export function setSearchSmartConfig(config: ResolvedSearchSmartConfig): void {
  cached = config;
}

export function getSearchSmartConfig(): ResolvedSearchSmartConfig {
  return cached ?? { ...DEFAULT };
}
