import type { NextRequest } from "next/server";
import {
  getCachedSetupStatus,
  setCachedSetupStatus,
  type SetupStatusCache,
} from "@/features/setup/setup-middleware-cache";
import {
  mergeSetupStatusWithEnvOverrides,
  setupStatusFromCookieFallback,
  statusFromEnvFallback,
} from "@/features/setup/merge-setup-status";
import { getMiddlewareManifestSetup } from "@/features/setup/middleware-manifest";
import { getSetupCompleteEnvOverride } from "@/features/setup/setup-env-overrides";
import {
  SETUP_COMPLETE_COOKIE,
  hasSetupCompleteCookie,
} from "@/features/setup/setup-cookie";
import { internalFetchOrigins, SETUP_STATUS_FETCH_TIMEOUT_MS } from "@/middleware/internal-fetch";

export function isCatalogAdminApi(pathname: string): boolean {
  return (
    pathname === "/api/collections" ||
    pathname.startsWith("/api/collections/") ||
    pathname === "/api/sync-collections"
  );
}

export function resolveSetupStatusForCatalogApi(): SetupStatusCache {
  const cached = getCachedSetupStatus();
  if (cached) return cached;
  const envFallback = statusFromEnvFallback();
  if (envFallback) return envFallback;
  return setCachedSetupStatus({
    setupComplete: true,
    registrationEnabled: true,
    comingSoonEnabled: false,
    confident: true,
  });
}

async function fetchSetupStatusFromApi(origin: string) {
  const url = new URL("/api/setup/status", origin);
  const res = await fetch(url, {
    headers: { "x-middleware": "1" },
    cache: "no-store",
    signal: AbortSignal.timeout(SETUP_STATUS_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    setupComplete?: boolean;
    registrationEnabled?: boolean;
    comingSoonEnabled?: boolean;
  };
  return mergeSetupStatusWithEnvOverrides(
    {
      setupComplete: Boolean(data.setupComplete),
      registrationEnabled: data.registrationEnabled !== false,
      comingSoonEnabled: Boolean(data.comingSoonEnabled),
      confident: true,
    },
    { fromApi: true },
  );
}

/**
 * Resolve durable setup state before any self-HTTP.
 * Order: memory → env → cookie → build manifest → (optional) API fetch.
 * Once setup is definitively complete, public marketing requests must not
 * rediscover that fact via internal HTTP on every cold worker.
 */
export async function resolveSetupStatus(request: NextRequest) {
  const now = Date.now();
  const cached = getCachedSetupStatus(now);
  if (cached) {
    return cached;
  }

  const setupEnv = getSetupCompleteEnvOverride();
  if (setupEnv === true) {
    const envFallback = statusFromEnvFallback();
    if (envFallback) return envFallback;
  }

  if (hasSetupCompleteCookie(request.cookies.get(SETUP_COMPLETE_COOKIE)?.value)) {
    return setupStatusFromCookieFallback();
  }

  const manifestStatus = getMiddlewareManifestSetup();
  if (manifestStatus?.setupComplete) {
    return mergeSetupStatusWithEnvOverrides({
      ...manifestStatus,
      confident: true,
    });
  }

  for (const origin of internalFetchOrigins(request)) {
    try {
      const status = await fetchSetupStatusFromApi(origin);
      if (status) return status;
    } catch {
      // try next origin (Hostinger self-fetch often needs localhost fallback)
    }
  }

  if (manifestStatus) {
    return mergeSetupStatusWithEnvOverrides({
      ...manifestStatus,
      confident: true,
    });
  }

  const envFallback = statusFromEnvFallback();
  if (envFallback) {
    return envFallback;
  }

  return {
    setupComplete: false,
    registrationEnabled: true,
    comingSoonEnabled: false,
    confident: false,
    expires: 0,
  };
}

/**
 * Public marketing paths: resolve setup without HTTP when durable state says complete.
 * Falls back to full resolveSetupStatus only when durable sources are inconclusive.
 */
export async function resolveSetupStatusForPublicMarketing(
  request: NextRequest,
): Promise<SetupStatusCache> {
  const now = Date.now();
  const cached = getCachedSetupStatus(now);
  if (cached?.setupComplete && cached.confident) {
    return cached;
  }

  const setupEnv = getSetupCompleteEnvOverride();
  if (setupEnv === true) {
    const envFallback = statusFromEnvFallback();
    if (envFallback) return envFallback;
  }

  if (hasSetupCompleteCookie(request.cookies.get(SETUP_COMPLETE_COOKIE)?.value)) {
    return setupStatusFromCookieFallback();
  }

  const manifestStatus = getMiddlewareManifestSetup();
  if (manifestStatus?.setupComplete) {
    return mergeSetupStatusWithEnvOverrides({
      ...manifestStatus,
      confident: true,
    });
  }

  // Incomplete / unknown — need authoritative status (may HTTP once).
  return resolveSetupStatus(request);
}

/** Public marketing paths that should not be blocked when setup status is uncertain. */
export function isPublicMarketingPath(pathname: string, locales: string[]): boolean {
  if (pathname === "/") return true;
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/preview")
  ) {
    return false;
  }
  for (const locale of locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return true;
    }
  }
  // Unprefixed default-locale marketing paths (localePrefix as-needed)
  return true;
}

/** Paths reachable before setup is marked complete (avoids /setup ↔ /admin loops). */
export function isSetupExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api/setup")) return true;
  return false;
}

/** Setup lives at /setup (not under [locale]). Detect /{locale}/setup from pathname shape only. */
export function resolveSetupPath(pathname: string): { isSetup: boolean; canonical: string | null } {
  if (pathname === "/setup" || pathname.startsWith("/setup/")) {
    return { isSetup: true, canonical: pathname };
  }
  const match = pathname.match(/^\/([a-z0-9-]+)\/setup(\/.*)?$/i);
  if (match) {
    return { isSetup: true, canonical: `/setup${match[2] ?? ""}` };
  }
  return { isSetup: false, canonical: null };
}
