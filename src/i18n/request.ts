import { getRequestConfig } from "next-intl/server";
import { isValidUrlPrefixSync, resolvePrefixToCode } from "@/i18n/locale-config";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
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

  if (!urlPrefix || !isValidUrlPrefixSync(urlPrefix, locales)) {
    urlPrefix = await getDefaultUrlPrefix();
  }

  const code = resolvePrefixToCode(urlPrefix, locales);
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
