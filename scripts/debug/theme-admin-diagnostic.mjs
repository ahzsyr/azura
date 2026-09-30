#!/usr/bin/env node
/**
 * Diagnose /admin/theme 500 — checks SiteTheme columns and Prisma fetch.
 * Writes NDJSON to debug-2ccf00.log
 */
import { appendFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

function agentLog(hypothesisId, message, data) {
  const payload = {
    sessionId: "2ccf00",
    hypothesisId,
    location: "scripts/debug/theme-admin-diagnostic.mjs",
    message,
    data,
    timestamp: Date.now(),
  };
  const line = `${JSON.stringify(payload)}\n`;
  appendFileSync(join(process.cwd(), "debug-2ccf00.log"), line);
  console.log(line.trim());
}

function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: error.code ?? null,
      meta: error.meta ?? null,
    };
  }
  return { raw: String(error) };
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    agentLog("H0", "DATABASE_URL unset — cannot diagnose DB", {});
    process.exit(1);
  }

  const isPostgres = url.startsWith("postgres");
  agentLog("H3", "database provider", { isPostgres });

  const prisma = new PrismaClient();
  try {
    let columns;
    if (isPostgres) {
      columns = await prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'SiteTheme'
          AND column_name IN ('cursorEffectSettings', 'textEffectSettings', 'motionSettings')
        ORDER BY column_name`;
    } else {
      columns = await prisma.$queryRawUnsafe(
        `SELECT COLUMN_NAME AS column_name
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'SiteTheme'
           AND COLUMN_NAME IN ('cursorEffectSettings', 'textEffectSettings', 'motionSettings')
         ORDER BY COLUMN_NAME`,
      );
    }
    agentLog("H1", "effect settings columns present", {
      columns,
      count: Array.isArray(columns) ? columns.length : 0,
      expected: 3,
    });

    const draft = await prisma.siteTheme.findUnique({ where: { id: "draft" } });
    const published = await prisma.siteTheme.findUnique({ where: { id: "published" } });
    agentLog("H1", "prisma siteTheme findUnique succeeded", {
      hasDraft: Boolean(draft),
      hasPublished: Boolean(published),
    });
  } catch (error) {
    agentLog("H1", "prisma siteTheme query failed", { error: serializeError(error) });
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  agentLog("H0", "diagnostic script crashed", { error: serializeError(error) });
  process.exit(3);
});
