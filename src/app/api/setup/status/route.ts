import { NextResponse } from "next/server";
import { getSetupStatus } from "@/features/setup/setup.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Public setup status for middleware / wizard.
 * Never leaks DB host, user, or probe errors — those live on /api/setup/db-diag (auth required).
 */
function isDatabaseConnectionFailure(message: string | null): boolean {
  if (!message) return false;
  return /45028|did not accept a connection|Cannot reach MySQL|Authentication failed|DATABASE_URL is/i.test(
    message,
  );
}

export async function GET() {
  let status;
  try {
    status = await getSetupStatus();
  } catch (error) {
    console.error("[setup/status] getSetupStatus failed:", error);
    return NextResponse.json(
      {
        setupComplete: false,
        registrationEnabled: true,
        comingSoonEnabled: false,
        databaseReady: false,
        databaseKind: null,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  }

  // Connection failure is not a fresh install. 503 lets middleware use cookie/manifest fallback
  // instead of confidently sending the live site to /welcome.
  if (
    !status.setupComplete &&
    !status.databaseReady &&
    isDatabaseConnectionFailure(status.databaseError)
  ) {
    return NextResponse.json(
      {
        setupComplete: false,
        registrationEnabled: true,
        comingSoonEnabled: false,
        databaseReady: false,
        databaseKind: status.databaseKind ?? null,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  }

  return NextResponse.json(
    {
      setupComplete: status.setupComplete,
      registrationEnabled: status.registrationEnabled,
      comingSoonEnabled: status.comingSoonEnabled,
      databaseReady: status.databaseReady,
      databaseKind: status.databaseKind ?? null,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
