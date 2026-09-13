import "server-only";

import type {
  ResolvedTranslationAiCredentials,
  TranslationAiProviderId,
  TranslationAiProviderMeta,
  TranslationProvider,
} from "./types";
import { TRANSLATION_AI_PROVIDER_META } from "./provider-meta";
import { OpenAiCompatibleTranslationProvider } from "./openai-compatible";
import { GeminiTranslationProvider } from "./gemini";
import { DeepLTranslationProvider } from "./deepl";
import { LibreTranslateProvider } from "./libretranslate";

export { TRANSLATION_AI_PROVIDER_META };

const META_BY_ID = new Map(
  TRANSLATION_AI_PROVIDER_META.map((m) => [m.id, m] as const)
);

export function getTranslationAiProviderMeta(
  id: TranslationAiProviderId
): TranslationAiProviderMeta {
  return META_BY_ID.get(id) ?? TRANSLATION_AI_PROVIDER_META[0]!;
}

export function listTranslationAiProviderMeta(): TranslationAiProviderMeta[] {
  return TRANSLATION_AI_PROVIDER_META;
}

function chatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "");
  if (base.endsWith("/chat/completions")) return base;
  if (base.endsWith("/v1")) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

export function buildTranslationProvider(
  credentials: ResolvedTranslationAiCredentials
): TranslationProvider {
  const meta = getTranslationAiProviderMeta(credentials.provider);
  const model = credentials.model?.trim() || meta.defaultModel || "";
  const apiKey = credentials.apiKey?.trim() || undefined;
  const baseUrl =
    credentials.baseUrl?.trim() || meta.defaultBaseUrl || undefined;

  switch (credentials.provider) {
    case "openai":
      return new OpenAiCompatibleTranslationProvider({
        name: "OpenAI",
        apiKey,
        model,
        chatCompletionsUrl: chatCompletionsUrl(baseUrl ?? "https://api.openai.com/v1"),
      });
    case "groq":
      return new OpenAiCompatibleTranslationProvider({
        name: "Groq",
        apiKey,
        model,
        chatCompletionsUrl: chatCompletionsUrl(
          baseUrl ?? "https://api.groq.com/openai/v1"
        ),
      });
    case "openrouter":
      return new OpenAiCompatibleTranslationProvider({
        name: "OpenRouter",
        apiKey,
        model,
        chatCompletionsUrl: chatCompletionsUrl(
          baseUrl ?? "https://openrouter.ai/api/v1"
        ),
        extraHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://localhost",
          "X-Title": "AZURA Translations",
        },
      });
    case "deepseek":
      return new OpenAiCompatibleTranslationProvider({
        name: "DeepSeek",
        apiKey,
        model,
        chatCompletionsUrl: chatCompletionsUrl(
          baseUrl ?? "https://api.deepseek.com"
        ),
      });
    case "gemini":
      return new GeminiTranslationProvider({ apiKey, model });
    case "deepl":
      return new DeepLTranslationProvider({ apiKey, baseUrl });
    case "libretranslate":
      return new LibreTranslateProvider({ apiKey, baseUrl });
    default:
      return new OpenAiCompatibleTranslationProvider({
        name: "OpenAI",
        apiKey,
        model: model || "gpt-4o-mini",
        chatCompletionsUrl: chatCompletionsUrl("https://api.openai.com/v1"),
      });
  }
}

/** Whether the given credentials are enough to run Queue AI for this provider. */
export function isTranslationAiConfigured(
  credentials: ResolvedTranslationAiCredentials
): boolean {
  const meta = getTranslationAiProviderMeta(credentials.provider);
  if (meta.requiresBaseUrl && !credentials.baseUrl?.trim()) return false;
  if (meta.requiresApiKey && !credentials.apiKey?.trim()) return false;
  return true;
}
