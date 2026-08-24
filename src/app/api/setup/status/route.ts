import { NextResponse } from "next/server";
import { getSetupStatus } from "@/features/setup/setup.service";

/**
 * Public setup status for middleware / wizard.
 * Never leaks DB host, user, or probe errors — those live on /api/setup/db-diag (auth required).
 */
export async function GET() {
  const status = await getSetupStatus();

  return NextResponse.json(
    {
      setupComplete: status.setupComplete,
      registrationEnabled: status.registrationEnabled,
      comingSoonEnabled: status.comingSoonEnabled,
      databaseReady: status.databaseReady,
      databaseKind: status.databaseKind ?? null,
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
