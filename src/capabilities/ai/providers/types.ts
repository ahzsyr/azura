export type TranslationItem = {
  sourceText: string;
  sourceLocale: string;
  targetLocale: string;
};

export interface TranslationProvider {
  readonly name: string;
  isAvailable(): boolean;
  translateBatch(items: TranslationItem[]): Promise<string[]>;
}

export type {
  TranslationAiProviderId,
  TranslationAiProviderMeta,
} from "./provider-meta";

export {
  TRANSLATION_AI_PROVIDER_IDS,
  isTranslationAiProviderId,
  TRANSLATION_AI_PROVIDER_META,
} from "./provider-meta";

/** Resolved credentials + options passed into a provider adapter. */
export type ResolvedTranslationAiCredentials = {
  provider: import("./provider-meta").TranslationAiProviderId;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};
