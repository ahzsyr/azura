import "server-only";

import type { ResolvedSearchSmartConfig } from "@/features/search/settings/resolve-search-smart-config";

/**
 * Optional semantic / AI-assisted search layer.
 * - AI assist: rewrite natural-language queries to keyword phrases (OpenAI when configured).
 * - Semantic re-rank: placeholder for vector similarity when embeddings are indexed on documents.
 */
export class SearchSemanticProvider {
  isAvailable(config: ResolvedSearchSmartConfig["semantic"]): boolean {
    if (!config.enabled && !config.aiAssistEnabled) return false;
    if (config.provider === "openai") {
      return Boolean(process.env.OPENAI_API_KEY?.trim());
    }
    return false;
  }

  /** Extract searchable keywords from conversational queries. */
  async rewriteNaturalLanguageQuery(
    query: string,
    config: ResolvedSearchSmartConfig["semantic"]
  ): Promise<string> {
    if (!config.aiAssistEnabled || !this.isAvailable(config)) return query;
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) return query;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0,
          max_tokens: 64,
          messages: [
            {
              role: "system",
              content:
                "You convert user search requests into short keyword-only search queries (2–8 words). Output only the keywords, no punctuation or explanation.",
            },
            { role: "user", content: query },
          ],
        }),
      });
      if (!res.ok) return query;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      return text && text.length >= 2 ? text : query;
    } catch {
      return query;
    }
  }

  /**
   * Semantic re-rank boost per document key (0–1). Returns empty until embeddings exist on SearchDocument.
   */
  async semanticScores(
    _query: string,
    _keys: string[],
    config: ResolvedSearchSmartConfig["semantic"]
  ): Promise<Map<string, number>> {
    if (!config.enabled || config.provider === "none") return new Map();
    return new Map();
  }
}

export const searchSemanticProvider = new SearchSemanticProvider();
