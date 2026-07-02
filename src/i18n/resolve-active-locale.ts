import "server-only";

import { localeService } from "@/features/i18n/locale.service";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import type { PublicLocale } from "@/i18n/locale-config";
import type { TranslationContext } from "@/features/translation/translation-resolver";

export type ActiveLocaleContext = {
  urlPrefix: string;
  languageCode: string;
  enabledLocales: PublicLocale[];
  defaultCode: string;
  translationContext: Pick<TranslationContext, "enabledLocales" | "defaultCode">;
};

export async function resolveActiveLocale(urlPrefix: string): Promise<ActiveLocaleContext> {
  const enabledLocales = await localeService.listEnabled();
  const defaultCode =
    enabledLocales.find((locale) => locale.isDefault)?.code ?? enabledLocales[0]?.code ?? "en";
  const languageCode = resolvePrefixToCode(urlPrefix, enabledLocales);
  return {
    urlPrefix,
    languageCode,
    enabledLocales,
    defaultCode,
    translationContext: {
      enabledLocales,
      defaultCode,
    },
  };
}

