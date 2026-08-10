import { NextResponse } from "next/server";
import { getSetupStatus } from "@/features/setup/setup.service";

export async function GET() {
  const status = await getSetupStatus();
  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  const dbHost = dbUrl.match(/@([^/:?]+)/)?.[1] ?? "unset";
  const dbUser = dbUrl.match(/\/\/([^:]+):/)?.[1] ?? "unset";

  return NextResponse.json(
    {
      ...status,
      databaseDiag: status.databaseReady
        ? null
        : {
            dbHost,
            dbUser,
            projectRef: dbUser.includes(".") ? dbUser.split(".")[1] : dbUser,
            hint: "Open /api/setup/db-diag for full probe details",
          },
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
