import { NextResponse } from "next/server";
import { getAdminEmailHint } from "@/lib/admin-email-hint";
import { isSetupDatabaseReady, readSystemSettings } from "@/features/setup/setup.service";

export async function GET() {
  const dbReady = await isSetupDatabaseReady();
  const settings = await readSystemSettings();
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
