import { NextResponse } from "next/server";
import { revalidateWiredMarketingPaths } from "@/features/cms/revalidate-wired-marketing";
import { readSystemSettings } from "@/features/setup/setup.service";
import {
  ensureDefaultHeaderWorkspace,
  ensurePublishedHomePage,
} from "@/features/setup/ensure-baseline-cms";
import { revalidateJsonNamespace } from "@/services/cache";
import {
  invalidateSetupStatusCache,
  setCachedSetupStatus,
} from "@/features/setup/setup-middleware-cache";
import { refreshMiddlewareManifestBestEffort } from "@/features/setup/refresh-middleware-manifest.server";
import {
  getSetupCompleteCookieValue,
  setupCompleteCookieOptions,
  SETUP_COMPLETE_COOKIE,
} from "@/features/setup/setup-cookie";
import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import { ensureAuthSecretAtSetup } from "@/lib/auth-secret.server";
import {
  getSetupTokenFromRequest,
  requireSetupDiagnosticsAccess,
} from "@/features/setup/setup-api-auth";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/features/auth/portal";
import { isValidSetupToken } from "@/features/setup/setup-token";

/** Allow only same-origin relative paths (blocks open redirects). */
function sanitizeReturnTo(returnTo: string | null): string | null {
  if (!returnTo?.trim()) return null;
  const trimmed = returnTo.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  return trimmed;
}

function applySetupCompleteCookie(response: NextResponse) {
  response.cookies.set(
    SETUP_COMPLETE_COOKIE,
    getSetupCompleteCookieValue(),
    setupCompleteCookieOptions(),
  );
  return response;
}

async function canRepairBaseline(request: Request): Promise<boolean> {
  const session = await auth();
  if (isAdminRole(session?.user?.role)) return true;
  return isValidSetupToken(getSetupTokenFromRequest(request));
}

/**
 * Sync middleware cookie when DB already has setupComplete.
 * Public when setup is complete (visitors need the cookie to leave /setup loops).
 * When setup is incomplete, requires admin or SETUP_TOKEN.
 */
export async function GET(request: Request) {
  const settings = await readSystemSettings();
  const returnTo = sanitizeReturnTo(new URL(request.url).searchParams.get("returnTo"));

  if (!settings.setupComplete) {
    const unauthorized = await requireSetupDiagnosticsAccess(request);
    if (unauthorized) return unauthorized;
    if (returnTo) {
      return NextResponse.redirect(new URL(returnTo, request.url));
    }
    return NextResponse.json(
      { reconciled: false, setupComplete: false, message: "Setup is not marked complete in the database." },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  invalidateSetupStatusCache();
  setCachedSetupStatus({
    setupComplete: true,
    registrationEnabled: settings.registrationEnabled,
    comingSoonEnabled: settings.comingSoonEnabled ?? false,
    confident: true,
  });
  await refreshMiddlewareManifestBestEffort("setup reconcile");
  await ensureAuthSecretAtSetup();

  let homePublished = false;
  let headerSeeded = false;
  if (await canRepairBaseline(request)) {
    const repaired = await prisma.$transaction(async (tx) => {
      const home = await ensurePublishedHomePage(tx);
      const header = await ensureDefaultHeaderWorkspace(tx);
      return { homePublished: home.updated, headerSeeded: header.updated };
    });
    homePublished = repaired.homePublished;
    headerSeeded = repaired.headerSeeded;
    if (homePublished) {
      const locales = await localeService.getEnabledUrlPrefixes();
      revalidateWiredMarketingPaths("home", locales.length > 0 ? locales : ["en"]);
    }
    if (headerSeeded) {
      revalidateJsonNamespace("header-workspace");
    }
  }

  if (returnTo) {
    return applySetupCompleteCookie(NextResponse.redirect(new URL(returnTo, request.url)));
  }

  return applySetupCompleteCookie(
    NextResponse.json(
      {
        reconciled: true,
        setupComplete: true,
        homePublished,
        headerSeeded,
        message:
          homePublished || headerSeeded
            ? "Setup cookie refreshed; homepage and/or header nav repaired."
            : "Setup cookie and cache refreshed. Visit /account/login to sign in.",
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    ),
  );
}
