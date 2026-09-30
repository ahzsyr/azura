import "server-only";

import type { TranslationProvider } from "./types";
import { OpenAiCompatibleTranslationProvider } from "./openai-compatible";
import { createTranslationProvider } from "./factory";

/** Thin OpenAI-named wrapper kept for existing imports. */
export class OpenAiTranslationProvider extends OpenAiCompatibleTranslationProvider {
  constructor(apiKey: string | undefined, model = "gpt-4o-mini") {
    super({
      name: "OpenAI",
      apiKey,
      model,
      chatCompletionsUrl: "https://api.openai.com/v1/chat/completions",
    });
  }
}

/** Preferred entry: load admin config and build the selected provider. */
export async function createDefaultTranslationProvider(): Promise<TranslationProvider> {
  return createTranslationProvider();
}

/** @deprecated Prefer createDefaultTranslationProvider() / createTranslationProvider(). */
export function getDefaultTranslationProvider(): TranslationProvider {
  return new OpenAiTranslationProvider(undefined);
}
