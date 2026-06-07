import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasFixableDatabaseUrlFormatting, isDatabaseUrlMalformed, sanitizeDatabaseUrl } from "@/lib/database-url";

function getSanitizedDbInfo() {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  const url = sanitizeDatabaseUrl(raw);
  const host = url.match(/@([^/:?]+)/)?.[1] ?? "unset";
  const user = url.match(/\/\/([^:]+):/)?.[1] ?? "unset";
  const projectRef = user.includes(".") ? user.split(".")[1] : user;
  return {
    hasDatabaseUrl: Boolean(url),
    urlMalformed: isDatabaseUrlMalformed(raw),
    urlNeedsCleanup: hasFixableDatabaseUrlFormatting(raw),
    dbProtocol: url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1] ?? "unset",
    dbHost: host,
    dbUser: user,
    projectRef,
    passwordUrlEncoded: !url.includes("@2026@") && url.includes("%40"),
  };
}

export async function GET() {
  const dbInfo = getSanitizedDbInfo();
  let prismaProvider = "unknown";
  try {
    const clientIndex = join(process.cwd(), "node_modules", ".prisma", "client", "index.js");
    if (existsSync(clientIndex)) {
      prismaProvider =
        readFileSync(clientIndex, "utf-8").match(/"activeProvider":\s*"(\w+)"/)?.[1] ?? "unknown";
    }
  } catch {
    /* ignore */
  }

  const expectedProvider = dbInfo.dbProtocol === "postgresql" ? "postgresql" : "mysql";
  let probeOk = false;
  let probeError = "";
  try {
    await prisma.$queryRaw`SELECT 1`;
    probeOk = true;
  } catch (error) {
    probeError = error instanceof Error ? error.message : String(error);
  }

  const configLooksValid =
    !dbInfo.urlMalformed &&
    dbInfo.projectRef !== "unset" &&
    dbInfo.projectRef !== "direct" &&
    dbInfo.dbHost.includes("pooler.supabase.com") &&
    prismaProvider === expectedProvider;

  // #region agent log
  import("@/lib/debug-ingest").then(({ debugIngest }) =>
    debugIngest(
      "api/setup/db-diag/route.ts:GET",
      "db diag probe",
      {
        probeOk,
        urlMalformed: dbInfo.urlMalformed,
        urlNeedsCleanup: dbInfo.urlNeedsCleanup,
        dbHost: dbInfo.dbHost,
        projectRef: dbInfo.projectRef,
        prismaProvider,
        providerMatch: prismaProvider === expectedProvider,
        probeError: probeError.slice(0, 200),
      },
      "H2",
      probeOk ? "post-fix" : "pre-fix",
    ),
  );
  // #endregion

  const payload = {
    probeOk,
    ...dbInfo,
    prismaProvider,
    providerMatch: prismaProvider === expectedProvider,
    configLooksValid,
    suggestedAction: probeOk
      ? null
      : dbInfo.urlMalformed
        ? "fix_database_url_format_in_hpanel"
        : configLooksValid
        ? "reset_supabase_db_password_and_update_hpanel"
        : "fix_database_url_in_hpanel",
    probeError: probeError.slice(0, 500),
    nodeEnv: process.env.NODE_ENV ?? "unset",
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
