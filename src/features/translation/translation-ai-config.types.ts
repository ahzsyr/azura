import type {
  TranslationAiProviderId,
  TranslationAiProviderMeta,
} from "@/capabilities/ai/providers/provider-meta";

/** Safe-for-client view of Translations → Configuration (no secrets). */
export type TranslationAiConfigPublic = {
  provider: TranslationAiProviderId;
  providerLabel: string;
  hasApiKey: boolean;
  model?: string;
  baseUrl?: string;
  requiresApiKey: boolean;
  requiresModel: boolean;
  requiresBaseUrl: boolean;
  allowBaseUrlOverride: boolean;
  apiKeyOptional: boolean;
  defaultModel?: string;
  hint: string;
  isConfigured: boolean;
  providers: TranslationAiProviderMeta[];
};
