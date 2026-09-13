import "server-only";

import type { TranslationItem, TranslationProvider } from "./types";

/** Map BCP-47 / app locale codes to DeepL language codes. */
function toDeepLLang(code: string): string {
  const base = code.trim().toLowerCase().split(/[-_]/)[0] ?? code;
  const map: Record<string, string> = {
    en: "EN",
    ar: "AR",
    de: "DE",
    fr: "FR",
    es: "ES",
    it: "IT",
    pt: "PT",
    ru: "RU",
    ja: "JA",
    zh: "ZH",
    ko: "KO",
    nl: "NL",
    pl: "PL",
    tr: "TR",
    uk: "UK",
    sv: "SV",
    da: "DA",
    fi: "FI",
    el: "EL",
    cs: "CS",
    ro: "RO",
    hu: "HU",
    bg: "BG",
    id: "ID",
  };
  return map[base] ?? base.toUpperCase();
}

type DeepLOptions = {
  apiKey: string | undefined;
  /** Override host; otherwise free vs pro inferred from key suffix. */
  baseUrl?: string;
};

/**
 * DeepL /v2/translate — dedicated translation API (not chat).
 */
export class DeepLTranslationProvider implements TranslationProvider {
  readonly name = "deepl";
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string | undefined;

  constructor(options: DeepLOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey?.trim());
  }

  private resolveEndpoint(): string {
    const override = this.baseUrl?.trim().replace(/\/$/, "");
    if (override) {
      return override.endsWith("/v2/translate")
        ? override
        : `${override}/v2/translate`;
    }
    const key = this.apiKey?.trim() ?? "";
    const host = key.endsWith(":fx")
      ? "https://api-free.deepl.com"
      : "https://api.deepl.com";
    return `${host}/v2/translate`;
  }

  async translateBatch(items: TranslationItem[]): Promise<string[]> {
    const apiKey = this.apiKey?.trim();
    if (!apiKey) {
      throw new Error(
        "DeepL API key is not configured. Add it under Translations → Configuration."
      );
    }
    if (items.length === 0) return [];

    // DeepL accepts multiple text params; group by target locale for one request when possible.
    const byTarget = new Map<string, { indexes: number[]; texts: string[]; source?: string }>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const key = `${item.sourceLocale}→${item.targetLocale}`;
      const group = byTarget.get(key) ?? {
        indexes: [],
        texts: [],
        source: item.sourceLocale,
      };
      group.indexes.push(i);
      group.texts.push(item.sourceText);
      byTarget.set(key, group);
    }

    const results = new Array<string>(items.length);
    const endpoint = this.resolveEndpoint();

    for (const [pair, group] of byTarget) {
      const targetLocale = pair.split("→")[1]!;
      const body = new URLSearchParams();
      body.set("auth_key", apiKey);
      body.set("target_lang", toDeepLLang(targetLocale));
      if (group.source) body.set("source_lang", toDeepLLang(group.source));
      for (const text of group.texts) {
        body.append("text", text);
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`DeepL translation failed (${res.status}): ${errBody.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        translations?: { text?: string }[];
      };
      if (!Array.isArray(data.translations) || data.translations.length !== group.texts.length) {
        throw new Error("DeepL returned unexpected translation batch shape");
      }
      for (let j = 0; j < group.indexes.length; j++) {
        results[group.indexes[j]!] = String(data.translations[j]?.text ?? "");
      }
    }

    return results;
  }
}
