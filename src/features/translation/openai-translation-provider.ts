import "server-only";

import type { TranslationItem, TranslationProvider } from "./translation-provider";

const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAiTranslationProvider implements TranslationProvider {
  readonly name = "openai";

  isAvailable(): boolean {
    return Boolean(process.env.TRANSLATION_PROVIDER_API_KEY?.trim());
  }

  async translateBatch(items: TranslationItem[]): Promise<string[]> {
    const apiKey = process.env.TRANSLATION_PROVIDER_API_KEY?.trim();
    if (!apiKey) throw new Error("TRANSLATION_PROVIDER_API_KEY is not configured");
    if (items.length === 0) return [];

    const payload = items.map((item, index) => ({
      index,
      text: item.sourceText,
      from: item.sourceLocale,
      to: item.targetLocale,
    }));

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a professional translator. Return JSON: { \"translations\": string[] } with one translated string per input item, same order, preserving placeholders and HTML.",
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI translation failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty translation response");

    const parsed = JSON.parse(content) as { translations?: string[] };
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== items.length) {
      throw new Error("OpenAI returned unexpected translation batch shape");
    }

    return parsed.translations.map(String);
  }
}

export function getDefaultTranslationProvider(): TranslationProvider {
  return new OpenAiTranslationProvider();
}
