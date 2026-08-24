import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { isRetiredUrlPrefix } from "@/i18n/locale-config";
import { getMiddlewareManifestRouting } from "@/features/setup/middleware-manifest";
import {
  internalFetchOrigins,
  LOCALE_ROUTING_FETCH_TIMEOUT_MS,
} from "@/middleware/internal-fetch";

export type LocaleRoutingCache = {
  locales: string[];
  defaultLocale: string;
  expires: number;
};

const FALLBACK_LOCALE_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);
export const FALLBACK_DEFAULT_LOCALE =
  FALLBACK_LOCALES.find((locale) => locale.isDefault)?.urlPrefix ?? FALLBACK_LOCALES[0]!.urlPrefix;

let localeRoutingCache: LocaleRoutingCache | null = null;

export function getLocaleRoutingCache(): LocaleRoutingCache | null {
  return localeRoutingCache;
}

export function setLocaleRoutingCache(cache: LocaleRoutingCache | null): void {
  localeRoutingCache = cache;
}

async function fetchLocaleRoutingFromApi(origin: string): Promise<LocaleRoutingCache | null> {
  const url = new URL("/api/locales", origin);
  const res = await fetch(url, {
    headers: { "x-middleware": "1" },
    cache: "no-store",
    signal: AbortSignal.timeout(LOCALE_ROUTING_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    locales?: string[];
    defaultLocale?: string;
  };
  const locales = Array.isArray(data.locales)
    ? data.locales.filter((l): l is string => typeof l === "string" && l.length > 0)
    : [];
  if (locales.length === 0) return null;
  return {
    locales,
    defaultLocale:
      typeof data.defaultLocale === "string" && locales.includes(data.defaultLocale)
        ? data.defaultLocale
        : locales[0] ?? FALLBACK_DEFAULT_LOCALE,
    expires: Date.now() + 60_000,
  };
}

export async function resolveLocaleRouting(request: NextRequest): Promise<LocaleRoutingCache> {
  const now = Date.now();
  const pathname = request.nextUrl.pathname;
  const pathSegments = pathname.split("/").filter(Boolean);

  if (localeRoutingCache && localeRoutingCache.expires > now) {
    const cachedLocales = localeRoutingCache.locales;
    const needsRefresh = pathSegments.some(
      (segment) =>
        /^[a-z]{2}(?:-[a-z]{2})?$/i.test(segment) &&
        !cachedLocales.includes(segment.toLowerCase()),
    );
    if (!needsRefresh) {
      return localeRoutingCache;
    }
    localeRoutingCache = null;
  }

  const manifestRouting = getMiddlewareManifestRouting();
  if (manifestRouting) {
    localeRoutingCache = {
      ...manifestRouting,
      expires: Number.POSITIVE_INFINITY,
    };
    return localeRoutingCache;
  }

  for (const origin of internalFetchOrigins(request)) {
    try {
      const routingFromApi = await fetchLocaleRoutingFromApi(origin);
      if (routingFromApi) {
        localeRoutingCache = routingFromApi;
        return routingFromApi;
      }
    } catch {
      /* try next origin */
    }
  }

  localeRoutingCache = {
    locales: [...FALLBACK_LOCALE_PREFIXES],
    defaultLocale: FALLBACK_DEFAULT_LOCALE,
    expires: now + 60_000,
  };
  return localeRoutingCache;
}

/** Redirect retired locale prefixes to default locale. */
export function handleRetiredLocaleRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const retiredLocaleMatch = pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)(\/.*)?$/i);
  if (!retiredLocaleMatch) return null;

  const prefix = retiredLocaleMatch[1]!.toLowerCase();
  if (!isRetiredUrlPrefix(prefix)) return null;

  const rest = retiredLocaleMatch[2] ?? "";
  const url = request.nextUrl.clone();
  url.pathname = rest ? `/${FALLBACK_DEFAULT_LOCALE}${rest}` : `/${FALLBACK_DEFAULT_LOCALE}`;
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url, 308);
}

export { FALLBACK_LOCALE_PREFIXES };
