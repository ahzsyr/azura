import { getRequestConfig } from "next-intl/server";
import { isValidUrlPrefixSync, resolvePrefixToCode } from "@/i18n/locale-config";
import {
  getDefaultUrlPrefix,
  getEnabledLocales,
} from "@/i18n/locale-registry.server";
import { getMergedMessages } from "@/features/translation/ui-message.service";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";
import { routing } from "./routing";
import { loadCatalogUiMessages } from "./catalog-ui-messages";

async function loadFileMessages(code: string) {
  try {
    return (await import(`../../messages/${code}.json`)).default;
  } catch {
    try {
      return (await import(`../../messages/${routing.defaultLocale}.json`)).default;
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
  const catalogUi = loadCatalogUiMessages(urlPrefix);
  const merged = await getMergedMessages(code, fileMessages);
  let brandName: string;
  try {
    ({ brandName } = await loadSiteBrandContext());
  } catch {
    // DB unavailable during build or edge cases
    const { getDefaultSiteIdentity } = await import("@/lib/site-identity");
    brandName = getDefaultSiteIdentity().brandName;
  }
  const mergedRecord = merged as Record<string, unknown>;
  const messages = {
    ...merged,
    site: { brandName },
    product: {
      ...(typeof mergedRecord.product === "object" && mergedRecord.product !== null
        ? (mergedRecord.product as Record<string, string>)
        : {}),
      ...catalogUi.product,
    },
    collection: {
      ...(typeof mergedRecord.collection === "object" && mergedRecord.collection !== null
        ? (mergedRecord.collection as Record<string, string>)
        : {}),
      ...catalogUi.collection,
    },
    ...(catalogUi.nav && Object.keys(catalogUi.nav).length > 0
      ? {
          nav: {
            ...(typeof mergedRecord.nav === "object" && mergedRecord.nav !== null
              ? (mergedRecord.nav as Record<string, string>)
              : {}),
            ...catalogUi.nav,
          },
        }
      : {}),
  };

  return {
    locale: urlPrefix,
    messages,
  };
});
