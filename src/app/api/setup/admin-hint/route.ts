import { NextResponse } from "next/server";
import { getAdminEmailHint } from "@/lib/admin-email-hint";
import { isSetupDatabaseReady, readSystemSettings } from "@/features/setup/setup.service";
import { requireSetupDiagnosticsAccess } from "@/features/setup/setup-api-auth";

export async function GET(request: Request) {
  const settings = await readSystemSettings();

  // After setup: require admin or SETUP_TOKEN before revealing masked email.
  if (settings.setupComplete) {
    const unauthorized = await requireSetupDiagnosticsAccess(request);
    if (unauthorized) {
      return NextResponse.json(
        { setupComplete: true, dbReady: true, maskedEmail: null },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
  }

  const dbReady = await isSetupDatabaseReady();
  const hint = dbReady ? await getAdminEmailHint() : { email: null, maskedEmail: null, dbReady: false };

  return NextResponse.json(
    {
      setupComplete: settings.setupComplete,
      dbReady,
      maskedEmail: hint.maskedEmail,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
