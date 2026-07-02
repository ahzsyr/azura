import "server-only";

import { prisma } from "@/lib/prisma";
import { agentLog, serializeError } from "@/lib/debug/agent-log";

const SITE_THEME_EFFECT_SETTINGS_COLUMNS = [
  "cursorEffectSettings",
  "textEffectSettings",
  "motionSettings",
] as const;

type EnsureGlobal = {
  siteThemeEffectColumnsEnsured?: boolean;
  siteThemeEffectColumnsEnsuring?: Promise<void>;
};

const globalState = globalThis as unknown as EnsureGlobal;

function isPostgresDatabase(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return url.startsWith("postgres");
}

async function postgresColumnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ found: number }>>`
    SELECT 1 AS found
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
    LIMIT 1`;
  return rows.length > 0;
}

async function mysqlColumnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  return isPostgresDatabase()
    ? postgresColumnExists(table, column)
    : mysqlColumnExists(table, column);
}

async function addColumn(column: string): Promise<void> {
  if (isPostgresDatabase()) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SiteTheme" ADD COLUMN "${column}" JSONB NOT NULL DEFAULT '{}'`,
    );
    return;
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`SiteTheme\` ADD COLUMN \`${column}\` JSON NOT NULL DEFAULT ('{}')`,
  );
}

async function ensureSiteThemeEffectColumnsInternal(): Promise<void> {
  const added: string[] = [];
  const existing: string[] = [];

  for (const column of SITE_THEME_EFFECT_SETTINGS_COLUMNS) {
    if (await columnExists("SiteTheme", column)) {
      existing.push(column);
      continue;
    }
    await addColumn(column);
    added.push(column);
  }

  // #region agent log
  agentLog(
    "ensure-site-theme-effect-columns.server.ts",
    "ensureSiteThemeEffectColumns completed",
    { added, existing, isPostgres: isPostgresDatabase() },
    "H1",
  );
  // #endregion
}

/** Idempotent patch for SiteTheme effect tuning columns (skipped after first success per process). */
export async function ensureSiteThemeEffectColumns(): Promise<void> {
  if (globalState.siteThemeEffectColumnsEnsured) return;
  if (globalState.siteThemeEffectColumnsEnsuring) {
    await globalState.siteThemeEffectColumnsEnsuring;
    return;
  }

  globalState.siteThemeEffectColumnsEnsuring = (async () => {
    try {
      await ensureSiteThemeEffectColumnsInternal();
      globalState.siteThemeEffectColumnsEnsured = true;
    } catch (error) {
      // #region agent log
      agentLog(
        "ensure-site-theme-effect-columns.server.ts",
        "ensureSiteThemeEffectColumns failed",
        { error: serializeError(error) },
        "H1",
      );
      // #endregion
      throw error;
    } finally {
      globalState.siteThemeEffectColumnsEnsuring = undefined;
    }
  })();

  await globalState.siteThemeEffectColumnsEnsuring;
}
