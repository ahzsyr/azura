import type { LocaleConfig } from "../i18n/types";
import type { ShopperCurrencyContext } from "./types";
import { getCurrencyConfig, getCurrencyCookieName, getCurrencyEntry, isSupportedDisplayCurrency, normalizeRates } from "./config";
import { resolveCurrencyMark } from "./currency-mark";

function readCookieValue(rawCookie: string | null, name: string): string | null {
  if (!rawCookie) return null;
  const parts = rawCookie.split(";").map((p) => p.trim());
  const prefix = `${name}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return null;
}

/** Currency choice is independent of UI locale: cookie → configured default → first listed. */
function pickDisplayCode(cookieVal: string | null): { code: string; source: ShopperCurrencyContext["source"] } {
  if (cookieVal && isSupportedDisplayCurrency(cookieVal)) {
    return { code: cookieVal.trim().toUpperCase(), source: "cookie" };
  }
  const cfg = getCurrencyConfig();
  const d = cfg.defaultDisplayCurrency?.trim().toUpperCase();
  if (d && isSupportedDisplayCurrency(d)) {
    return { code: d, source: "config" };
  }
  const first = cfg.currencies[0]?.code;
  return { code: (first ?? "USD").toUpperCase(), source: "default" };
}

/**
 * Resolves shopper-facing currency for SSR (cookie → `defaultDisplayCurrency` in config → first listed).
 * Independent of UI locale; `locale` is only used for number-formatting fallback when a currency row has no `numberLocale`.
 */
export function resolveShopperCurrencyContext(
  request: Request,
  cookies: { get(name: string): { value: string } | undefined } | null | undefined,
  locale: LocaleConfig,
): ShopperCurrencyContext {
  const cfg = getCurrencyConfig();
  const base = cfg.baseCurrency.toUpperCase();
  const rates = normalizeRates(cfg.rates, base);

  const cookieName = getCurrencyCookieName();
  let cookieVal: string | null = null;
  if (cookies) {
    cookieVal = cookies.get(cookieName)?.value ?? null;
  }
  if (!cookieVal) {
    cookieVal = readCookieValue(request.headers.get("cookie"), cookieName);
  }

  const { code, source } = pickDisplayCode(cookieVal);
  const entry = getCurrencyEntry(code);
  const numberLocale =
    entry?.numberLocale ?? locale.currencyLocale ?? locale.numberLocale ?? "en-US";
  const mark = entry ? resolveCurrencyMark(entry) : null;

  return {
    displayCode: code,
    numberLocale,
    baseCurrency: base,
    rates,
    source,
    displaySymbol: mark?.text ?? null,
    displayLogo: mark?.imgSrc ?? null,
    displaySvgInline: mark?.inlineSvg ?? null,
    currencyMarkRenderAs: mark?.renderAs ?? "text",
  };
}
