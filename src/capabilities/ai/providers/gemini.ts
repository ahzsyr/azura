import "server-only";

import type { TranslationItem, TranslationProvider } from "./types";

const SYSTEM_PROMPT =
  'You are a professional translator. Return JSON: { "translations": string[] } with one translated string per input item, same order, preserving placeholders and HTML.';

type GeminiOptions = {
  apiKey: string | undefined;
  model: string;
};

/**
 * Google Gemini generateContent adapter with the same JSON batch contract.
 */
export class GeminiTranslationProvider implements TranslationProvider {
  readonly name = "gemini";
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(options: GeminiOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey?.trim());
  }

  async translateBatch(items: TranslationItem[]): Promise<string[]> {
    const apiKey = this.apiKey?.trim();
    if (!apiKey) {
      throw new Error(
        "Gemini API key is not configured. Add it under Translations → Configuration."
      );
    }
    if (items.length === 0) return [];

    const payload = items.map((item, index) => ({
      index,
      text: item.sourceText,
      from: item.sourceLocale,
      to: item.targetLocale,
    }));

    const model = encodeURIComponent(this.model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify(payload)}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini translation failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!content.trim()) throw new Error("Gemini returned empty translation response");

    const parsed = JSON.parse(content) as { translations?: string[] };
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== items.length) {
      throw new Error("Gemini returned unexpected translation batch shape");
    }

    return parsed.translations.map(String);
  }
}
