import type { NextRequest } from "next/server";
import { getMiddlewareManifestRedirect } from "@/features/setup/middleware-manifest";
import { internalFetchOrigins, REDIRECT_LOOKUP_FETCH_TIMEOUT_MS } from "@/middleware/internal-fetch";

type RedirectHit = { toPath: string; type: string } | null;

type RedirectCacheRow = {
  redirect: RedirectHit;
  expires: number;
};

const REDIRECT_CACHE_TTL_MS = 60_000;
const redirectLookupCache = new Map<string, RedirectCacheRow>();

export async function lookupRedirect(pathname: string, request: NextRequest): Promise<RedirectHit> {
  const now = Date.now();
  const cached = redirectLookupCache.get(pathname);
  if (cached && cached.expires > now) {
    return cached.redirect;
  }

  const manifestRedirect = getMiddlewareManifestRedirect(pathname);
  if (manifestRedirect.generated) {
    redirectLookupCache.set(pathname, {
      redirect: manifestRedirect.redirect,
      expires: Number.POSITIVE_INFINITY,
    });
    return manifestRedirect.redirect;
  }

  for (const origin of internalFetchOrigins(request)) {
    try {
      const lookupUrl = new URL(
        `/api/redirects?path=${encodeURIComponent(pathname)}`,
        origin,
      );
      const res = await fetch(lookupUrl, {
        headers: { "x-middleware": "1" },
        signal: AbortSignal.timeout(REDIRECT_LOOKUP_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as {
        redirect?: { toPath: string; type: string } | null;
      };
      const redirect = data.redirect ?? null;
      redirectLookupCache.set(pathname, { redirect, expires: now + REDIRECT_CACHE_TTL_MS });
      return redirect;
    } catch {
      // try next origin
    }
  }

  redirectLookupCache.set(pathname, { redirect: null, expires: now + REDIRECT_CACHE_TTL_MS });
  return null;
}
