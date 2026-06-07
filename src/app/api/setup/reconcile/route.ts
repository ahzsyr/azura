import { NextResponse } from "next/server";
import { readSystemSettings } from "@/features/setup/setup.service";
import {
  invalidateSetupStatusCache,
  setCachedSetupStatus,
} from "@/features/setup/setup-middleware-cache";
import {
  getSetupCompleteCookieValue,
  setupCompleteCookieOptions,
  SETUP_COMPLETE_COOKIE,
} from "@/features/setup/setup-cookie";

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

  if (returnTo) {
    return applySetupCompleteCookie(NextResponse.redirect(new URL(returnTo, request.url)));
  }

  return applySetupCompleteCookie(
    NextResponse.json(
      {
        reconciled: true,
        setupComplete: true,
        message: "Setup cookie and cache refreshed. Visit /admin/login to sign in.",
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    ),
  );
}
