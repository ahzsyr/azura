/** Client-safe provider metadata (no server-only imports). */

export type TranslationAiProviderId =
  | "openai"
  | "gemini"
  | "groq"
  | "openrouter"
  | "deepseek"
  | "deepl"
  | "libretranslate";

export const TRANSLATION_AI_PROVIDER_IDS: TranslationAiProviderId[] = [
  "openai",
  "gemini",
  "groq",
  "openrouter",
  "deepseek",
  "deepl",
  "libretranslate",
];

export function isTranslationAiProviderId(value: string): value is TranslationAiProviderId {
  return (TRANSLATION_AI_PROVIDER_IDS as string[]).includes(value);
}

export type TranslationAiProviderMeta = {
  id: TranslationAiProviderId;
  label: string;
  hint: string;
  requiresApiKey: boolean;
  apiKeyOptional?: boolean;
  requiresModel: boolean;
  requiresBaseUrl: boolean;
  defaultModel?: string;
  defaultBaseUrl?: string;
  allowBaseUrlOverride?: boolean;
};

/** Shared metadata for admin UI + server registry (keep in sync with registry defaults). */
export const TRANSLATION_AI_PROVIDER_META: TranslationAiProviderMeta[] = [
  {
    id: "openai",
    label: "OpenAI",
    hint: "Highest quality — no permanent free tier",
    requiresApiKey: true,
    requiresModel: true,
    requiresBaseUrl: false,
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    allowBaseUrlOverride: true,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    hint: "Large free tier via Google AI Studio",
    requiresApiKey: true,
    requiresModel: true,
    requiresBaseUrl: false,
    defaultModel: "gemini-2.0-flash",
  },
  {
    id: "groq",
    label: "Groq",
    hint: "Fast inference with open models — free rate limits",
    requiresApiKey: true,
    requiresModel: true,
    requiresBaseUrl: false,
    defaultModel: "llama-3.3-70b-versatile",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    allowBaseUrlOverride: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    hint: "Multiple models in one API — some free models",
    requiresApiKey: true,
    requiresModel: true,
    requiresBaseUrl: false,
    defaultModel: "google/gemini-2.0-flash-exp:free",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    allowBaseUrlOverride: true,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    hint: "Affordable OpenAI-compatible chat models",
    requiresApiKey: true,
    requiresModel: true,
    requiresBaseUrl: false,
    defaultModel: "deepseek-chat",
    defaultBaseUrl: "https://api.deepseek.com",
    allowBaseUrlOverride: true,
  },
  {
    id: "deepl",
    label: "DeepL",
    hint: "Professional translation API — limited free tier",
    requiresApiKey: true,
    requiresModel: false,
    requiresBaseUrl: false,
    allowBaseUrlOverride: true,
  },
  {
    id: "libretranslate",
    label: "LibreTranslate",
    hint: "Self-hosted / offline — API key optional",
    requiresApiKey: false,
    apiKeyOptional: true,
    requiresModel: false,
    requiresBaseUrl: true,
  },
];
