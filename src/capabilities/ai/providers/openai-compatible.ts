import "server-only";

import type { TranslationItem, TranslationProvider } from "./types";

const SYSTEM_PROMPT =
  'You are a professional translator. Return JSON: { "translations": string[] } with one translated string per input item, same order, preserving placeholders and HTML.';

type OpenAiCompatibleOptions = {
  name: string;
  apiKey: string | undefined;
  model: string;
  /** Full chat completions URL, e.g. https://api.openai.com/v1/chat/completions */
  chatCompletionsUrl: string;
  /** Extra request headers (e.g. OpenRouter HTTP-Referer). */
  extraHeaders?: Record<string, string>;
};

/**
 * Shared chat-completions adapter for OpenAI, Groq, OpenRouter, DeepSeek, etc.
 * Expects JSON response: { translations: string[] }.
 */
export class OpenAiCompatibleTranslationProvider implements TranslationProvider {
  readonly name: string;
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly chatCompletionsUrl: string;
  private readonly extraHeaders: Record<string, string>;

  constructor(options: OpenAiCompatibleOptions) {
    this.name = options.name;
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.chatCompletionsUrl = options.chatCompletionsUrl;
    this.extraHeaders = options.extraHeaders ?? {};
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey?.trim());
  }

  async translateBatch(items: TranslationItem[]): Promise<string[]> {
    const apiKey = this.apiKey?.trim();
    if (!apiKey) {
      throw new Error(
        `${this.name} API key is not configured. Add it under Translations → Configuration.`
      );
    }
    if (items.length === 0) return [];

    const payload = items.map((item, index) => ({
      index,
      text: item.sourceText,
      from: item.sourceLocale,
      to: item.targetLocale,
    }));

    const res = await fetch(this.chatCompletionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...this.extraHeaders,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${this.name} translation failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${this.name} returned empty translation response`);

    const parsed = JSON.parse(content) as { translations?: string[] };
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== items.length) {
      throw new Error(`${this.name} returned unexpected translation batch shape`);
    }

    return parsed.translations.map(String);
  }
}
