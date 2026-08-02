import "server-only";

import { jsonStoreService } from "@/features/storage/json-store.service";
import { sealSecret, unsealSecret } from "@/features/seo/integrations/secret-seal.server";
import {
  getTranslationAiProviderMeta,
  isTranslationAiConfigured,
  listTranslationAiProviderMeta,
} from "@/capabilities/ai/providers/registry";
import {
  isTranslationAiProviderId,
  type ResolvedTranslationAiCredentials,
  type TranslationAiProviderId,
} from "@/capabilities/ai/providers/types";
import type { TranslationAiConfigPublic } from "@/features/translation/translation-ai-config.types";

export type { TranslationAiConfigPublic } from "@/features/translation/translation-ai-config.types";

export const TRANSLATION_AI_NAMESPACE = "translation-ai";
export const TRANSLATION_AI_CONFIG_KEY = "config";

export type TranslationAiConfigRecord = {
  /** Active provider — defaults to openai when missing (migration). */
  provider?: TranslationAiProviderId;
  /** AES-sealed API key (never expose to client). */
  apiKeySealed?: string;
  model?: string;
  baseUrl?: string;
};

function normalizeProvider(raw: string | undefined): TranslationAiProviderId {
  if (raw && isTranslationAiProviderId(raw)) return raw;
  return "openai";
}

async function readRecord(): Promise<TranslationAiConfigRecord> {
  const data = await jsonStoreService.get<TranslationAiConfigRecord>(
    TRANSLATION_AI_NAMESPACE,
    TRANSLATION_AI_CONFIG_KEY,
  );
  return data ?? {};
}

function sanitizeBaseUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return trimmed.replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export const translationAiConfigService = {
  async getPublic(): Promise<TranslationAiConfigPublic> {
    const record = await readRecord();
    const provider = normalizeProvider(record.provider);
    const meta = getTranslationAiProviderMeta(provider);
    const apiKey = unsealSecret(record.apiKeySealed)?.trim();
    const model = record.model?.trim() || undefined;
    const baseUrl = record.baseUrl?.trim() || undefined;
    const credentials: ResolvedTranslationAiCredentials = {
      provider,
      apiKey,
      model,
      baseUrl,
    };

    return {
      provider,
      providerLabel: meta.label,
      hasApiKey: Boolean(apiKey),
      model,
      baseUrl,
      requiresApiKey: meta.requiresApiKey,
      requiresModel: meta.requiresModel,
      requiresBaseUrl: meta.requiresBaseUrl,
      allowBaseUrlOverride: Boolean(meta.allowBaseUrlOverride),
      apiKeyOptional: Boolean(meta.apiKeyOptional),
      defaultModel: meta.defaultModel,
      hint: meta.hint,
      isConfigured: isTranslationAiConfigured(credentials),
      providers: listTranslationAiProviderMeta(),
    };
  },

  async getResolvedCredentials(): Promise<ResolvedTranslationAiCredentials> {
    const record = await readRecord();
    const provider = normalizeProvider(record.provider);
    return {
      provider,
      apiKey: unsealSecret(record.apiKeySealed)?.trim() || undefined,
      model: record.model?.trim() || undefined,
      baseUrl: record.baseUrl?.trim() || undefined,
    };
  },

  /** @deprecated Prefer getResolvedCredentials().apiKey */
  async getApiKey(): Promise<string | undefined> {
    const creds = await this.getResolvedCredentials();
    return creds.apiKey;
  },

  async upsert(input: {
    provider?: TranslationAiProviderId | string;
    apiKey?: string;
    clearApiKey?: boolean;
    model?: string;
    baseUrl?: string;
  }): Promise<TranslationAiConfigPublic> {
    const existing = await readRecord();
    const provider = normalizeProvider(
      typeof input.provider === "string" ? input.provider : existing.provider
    );

    let apiKeySealed = existing.apiKeySealed;
    if (input.clearApiKey) {
      apiKeySealed = undefined;
    } else if (input.apiKey?.trim()) {
      apiKeySealed = sealSecret(input.apiKey);
    }

    const model =
      input.model !== undefined
        ? input.model.trim() || undefined
        : existing.model?.trim() || undefined;

    const baseUrl =
      input.baseUrl !== undefined
        ? sanitizeBaseUrl(input.baseUrl)
        : existing.baseUrl?.trim() || undefined;

    const next: TranslationAiConfigRecord = {
      provider,
      apiKeySealed,
      model,
      baseUrl,
    };

    await jsonStoreService.set(
      TRANSLATION_AI_NAMESPACE,
      TRANSLATION_AI_CONFIG_KEY,
      next,
      { revalidate: true },
    );

    return this.getPublic();
  },
};
