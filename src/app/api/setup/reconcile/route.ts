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

/** Sync middleware cookie when DB already has setupComplete. */
export async function GET(request: Request) {
  const settings = await readSystemSettings();
  const returnTo = sanitizeReturnTo(new URL(request.url).searchParams.get("returnTo"));

  if (!settings.setupComplete) {
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

  const { homePublished, headerSeeded } = await prisma.$transaction(async (tx) => {
    const home = await ensurePublishedHomePage(tx);
    const header = await ensureDefaultHeaderWorkspace(tx);
    return { homePublished: home.updated, headerSeeded: header.updated };
  });
  if (homePublished) {
    const locales = await localeService.getEnabledUrlPrefixes();
    revalidateWiredMarketingPaths("home", locales.length > 0 ? locales : ["en"]);
  }
  if (headerSeeded) {
    revalidateJsonNamespace("header-workspace");
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
            : "Setup cookie and cache refreshed. Visit /admin/login to sign in.",
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    ),
  );
}
