import { getRequestConfig } from "next-intl/server";
import { isValidUrlPrefixSync, resolvePrefixToCode } from "@/i18n/locale-config";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { messageFileExists } from "@/i18n/message-files";
import {
  getDefaultUrlPrefix,
  getEnabledLocales,
} from "@/i18n/locale-registry.server";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";

type NestedDict = Record<string, unknown>;

async function loadFileMessages(code: string): Promise<NestedDict> {
  const fallbackCode = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? FALLBACK_LOCALES[0]!.code;
  try {
    return (await import(`../../messages/${code}.json`)).default;
  } catch {
    try {
      return (await import(`../../messages/${fallbackCode}.json`)).default;
    } catch {
      return {};
    }
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locales = await getEnabledLocales();
  let urlPrefix = await requestLocale;
  const defaultPrefix = await getDefaultUrlPrefix();

  if (!urlPrefix || !isValidUrlPrefixSync(urlPrefix, locales)) {
    urlPrefix = defaultPrefix;
  }

  let code = resolvePrefixToCode(urlPrefix, locales);

  // Stale LocaleConfig rows without a message payload must not load English under a foreign
  // locale code (wrong <html lang> / hreflang). Default-locale path skips the FS check.
  if (urlPrefix !== defaultPrefix && !(await messageFileExists(code))) {
    urlPrefix = defaultPrefix;
    code = resolvePrefixToCode(urlPrefix, locales);
  }

  const fileMessages = await loadFileMessages(code);

  let brandName: string;
  try {
    ({ brandName } = await loadSiteBrandContext());
  } catch {
    const { getDefaultSiteIdentity } = await import("@/lib/site-identity");
    brandName = getDefaultSiteIdentity().brandName;
  }

  const messages = {
    ...fileMessages,
    site: {
      ...(typeof fileMessages.site === "object" && fileMessages.site !== null
        ? (fileMessages.site as Record<string, unknown>)
        : {}),
      brandName,
    },
  };

  return {
    locale: urlPrefix,
    messages,
  };
});
