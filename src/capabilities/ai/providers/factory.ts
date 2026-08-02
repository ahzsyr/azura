import "server-only";

import { translationAiConfigService } from "@/features/translation/translation-ai-config.service";
import { buildTranslationProvider } from "./registry";
import type { TranslationProvider } from "./types";

/** Load Translations → Configuration and instantiate the active provider. */
export async function createTranslationProvider(): Promise<TranslationProvider> {
  const credentials = await translationAiConfigService.getResolvedCredentials();
  return buildTranslationProvider(credentials);
}
