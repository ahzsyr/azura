import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  authorizeSetupToken,
  isSetupTokenRequired,
  isValidSetupToken,
  readSystemSettings,
} from "@/features/setup/setup.service";
import { isAdminRole } from "@/features/auth/portal";

function tokenFromRequest(request: Request): string | null {
  const header =
    request.headers.get("x-setup-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (header?.trim()) return header.trim();
  try {
    return new URL(request.url).searchParams.get("setupToken");
  } catch {
    return null;
  }
}

/** Admin session OR valid SETUP_TOKEN. Used for diagnostics / reconcile. */
export async function requireSetupDiagnosticsAccess(
  request: Request,
): Promise<NextResponse | null> {
  const settings = await readSystemSettings();
  const token = tokenFromRequest(request);

  if (!settings.setupComplete) {
    if (authorizeSetupToken(token)) return null;
    if (isSetupTokenRequired()) {
      return NextResponse.json(
        { error: "SETUP_TOKEN required" },
        { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    return null;
  }

  const session = await auth();
  if (isAdminRole(session?.user?.role)) return null;
  if (isValidSetupToken(token)) return null;

  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export { tokenFromRequest as getSetupTokenFromRequest };
