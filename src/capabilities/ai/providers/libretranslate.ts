import "server-only";

import type { TranslationItem, TranslationProvider } from "./types";

function toLibreLang(code: string): string {
  return (code.trim().toLowerCase().split(/[-_]/)[0] ?? code).toLowerCase();
}

type LibreTranslateOptions = {
  apiKey: string | undefined;
  baseUrl: string | undefined;
};

/**
 * LibreTranslate REST — self-hosted or public instance.
 * API key is optional depending on the instance.
 */
export class LibreTranslateProvider implements TranslationProvider {
  readonly name = "libretranslate";
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string | undefined;

  constructor(options: LibreTranslateOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
  }

  isAvailable(): boolean {
    return Boolean(this.baseUrl?.trim());
  }

  private endpoint(): string {
    const base = this.baseUrl?.trim().replace(/\/$/, "");
    if (!base) {
      throw new Error(
        "LibreTranslate base URL is not configured. Add it under Translations → Configuration."
      );
    }
    return base.endsWith("/translate") ? base : `${base}/translate`;
  }

  async translateBatch(items: TranslationItem[]): Promise<string[]> {
    if (!this.isAvailable()) {
      throw new Error(
        "LibreTranslate base URL is not configured. Add it under Translations → Configuration."
      );
    }
    if (items.length === 0) return [];

    const url = this.endpoint();
    const results: string[] = [];

    for (const item of items) {
      const body: Record<string, string> = {
        q: item.sourceText,
        source: toLibreLang(item.sourceLocale),
        target: toLibreLang(item.targetLocale),
        format: "text",
      };
      const key = this.apiKey?.trim();
      if (key) body.api_key = key;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(
          `LibreTranslate failed (${res.status}): ${errBody.slice(0, 200)}`
        );
      }

      const data = (await res.json()) as { translatedText?: string };
      results.push(String(data.translatedText ?? ""));
    }

    return results;
  }
}
