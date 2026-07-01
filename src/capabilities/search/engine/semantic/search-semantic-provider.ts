import "server-only";

import type { ResolvedSearchSmartConfig } from "@/capabilities/search/settings/resolve-search-smart-config";

export type SemanticCandidate = {
  key: string;
  text: string;
};

const SEMANTIC_TOP_N = 25;
const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Optional semantic / AI-assisted search layer.
 * - AI assist: rewrite natural-language queries to keyword phrases (OpenAI when configured).
 * - Semantic re-rank: embedding similarity on top-N candidates when enabled.
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
   * Semantic re-rank boost per document key (0–1) via OpenAI embeddings on query + candidate text.
   */
  async semanticScores(
    query: string,
    candidates: SemanticCandidate[],
    config: ResolvedSearchSmartConfig["semantic"]
  ): Promise<Map<string, number>> {
    if (!config.enabled || config.provider === "none") return new Map();
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey || !query.trim() || candidates.length === 0) return new Map();

    const slice = candidates.slice(0, SEMANTIC_TOP_N);
    const inputs = [
      query.trim(),
      ...slice.map((c) => c.text.trim().slice(0, 512)),
    ].filter(Boolean);

    try {
      const embeddings = await this.fetchEmbeddings(apiKey, inputs);
      if (embeddings.length < 2) return new Map();

      const queryEmb = embeddings[0];
      const map = new Map<string, number>();
      for (let i = 0; i < slice.length; i++) {
        const candidateEmb = embeddings[i + 1];
        if (!candidateEmb) continue;
        const sim = cosineSimilarity(queryEmb, candidateEmb);
        map.set(slice[i].key, Math.max(0, Math.min(1, sim)));
      }
      return map;
    } catch {
      return new Map();
    }
  }

  private async fetchEmbeddings(apiKey: string, inputs: string[]): Promise<number[][]> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: inputs,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: { embedding?: number[] }[];
    };
    return (data.data ?? []).map((row) => row.embedding ?? []);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

export const searchSemanticProvider = new SearchSemanticProvider();
