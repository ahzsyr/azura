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

export async function resolveSetupStatus(request: NextRequest) {
  const now = Date.now();
  const cached = getCachedSetupStatus(now);
  if (cached) {
    return cached;
  }

  const setupEnv = getSetupCompleteEnvOverride();
  if (setupEnv !== null) {
    const envFallback = statusFromEnvFallback();
    if (envFallback) return envFallback;
  }

  const manifestStatus = getMiddlewareManifestSetup();
  if (manifestStatus) {
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

  const envFallback = statusFromEnvFallback();
  if (envFallback) {
    return envFallback;
  }

  if (hasSetupCompleteCookie(request.cookies.get(SETUP_COMPLETE_COOKIE)?.value)) {
    return setupStatusFromCookieFallback();
  }

  return {
    setupComplete: false,
    registrationEnabled: true,
    comingSoonEnabled: false,
    confident: false,
    expires: 0,
  };
}

/** Public marketing paths that should not be blocked when setup status is uncertain. */
export function isPublicMarketingPath(pathname: string, locales: string[]): boolean {
  if (pathname === "/") return true;
  for (const locale of locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return true;
    }
  }
  return false;
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
