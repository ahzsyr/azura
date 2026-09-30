import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const searchSemanticProviderSchema = z.enum(["none", "openai"]);

export const searchSmartSchema = z.object({
  enableFuzzy: z.boolean().default(true),
  enablePartialMatch: z.boolean().default(true),
  enableSynonyms: z.boolean().default(true),
  enableMultiKeyword: z.boolean().default(true),
  /** Require every keyword to match (AND) vs any keyword (OR) for retrieval. */
  multiKeywordMode: z.preprocess(
    emptyToUndefined,
    z.enum(["all", "any"]).default("any"),
  ),
  exactMatchBoost: z.number().min(0).max(30).default(8),
  /** Max Levenshtein distance per token for fuzzy ranking (0 = off). */
  typoMaxDistance: z.number().min(0).max(4).default(2),
  /** Strip conversational prefixes (“show me”, “find”, …). */
  naturalLanguageParsing: z.boolean().default(true),
  /** Admin-defined synonym map: token → list of synonyms. */
  synonyms: z.record(z.string(), z.array(z.string())).default({}),
  semantic: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.preprocess(
        emptyToUndefined,
        searchSemanticProviderSchema.default("none"),
      ),
      /** Blend semantic re-rank boost (0–1) with lexical score. */
      hybridWeight: z.number().min(0).max(1).default(0.2),
      /** Rewrite natural-language queries to keywords via LLM when configured. */
      aiAssistEnabled: z.boolean().default(false),
      model: z.string().default("gpt-4o-mini"),
    })
    .default({}),
});

export type SearchSmartSettings = z.infer<typeof searchSmartSchema>;
