import "server-only";

import { prisma } from "@/lib/prisma";

const SITE_THEME_EFFECT_SETTINGS_COLUMNS = [
  "cursorEffectSettings",
  "textEffectSettings",
  "motionSettings",
  "mobileBrowserConfig",
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
  return Array.isArray(rows) && rows.length > 0;
}

async function mysqlColumnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column,
  );
  // BUILD_WITHOUT_DB stub returns undefined instead of an array.
  if (!Array.isArray(rows)) return false;
  return Number(rows[0]?.c ?? 0) > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  return isPostgresDatabase()
    ? postgresColumnExists(table, column)
    : mysqlColumnExists(table, column);
}

async function addColumn(column: string): Promise<void> {
  try {
    if (isPostgresDatabase()) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "SiteTheme" ADD COLUMN "${column}" JSONB NOT NULL DEFAULT '{}'`,
      );
      return;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`SiteTheme\` ADD COLUMN \`${column}\` JSON NOT NULL DEFAULT ('{}')`,
    );
  } catch (error) {
    // Concurrent boot / already-applied migration: treat duplicate column as success.
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicate column|already exists/i.test(message)) return;
    throw error;
  }
}

async function ensureSiteThemeEffectColumnsInternal(): Promise<void> {
  const added: string[] = [];

  for (const column of SITE_THEME_EFFECT_SETTINGS_COLUMNS) {
    if (await columnExists("SiteTheme", column)) continue;
    await addColumn(column);
    added.push(column);
  }

  if (added.length > 0) {
    console.info(
      `[theme] added SiteTheme columns: ${added.join(", ")} (postgres=${isPostgresDatabase()})`,
    );
  }
}

/** Idempotent patch for SiteTheme columns (skipped after first success per process). */
export async function ensureSiteThemeEffectColumns(): Promise<void> {
  // BUILD_WITHOUT_DB: Prisma is stubbed; raw queries return undefined. Skip here —
  // the deploy-time prisma-migrate-deploy.mjs patch covers the real DB.
  if (process.env.BUILD_WITHOUT_DB === "1") return;

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
      console.error("[theme] ensureSiteThemeEffectColumns failed:", error);
      throw error;
    } finally {
      globalState.siteThemeEffectColumnsEnsuring = undefined;
    }
  })();

  await globalState.siteThemeEffectColumnsEnsuring;
}
