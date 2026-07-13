#!/usr/bin/env node
/**
 * Apply pending database schema changes during deploy.
 *
 * MySQL (Hostinger): prisma migrate deploy (auto-skips baseline DBs without migration history)
 * PostgreSQL (Supabase): idempotent SQL patches (prisma/migrations are MySQL-oriented)
 *
 * Skip: SKIP_DB_MIGRATE=1 or missing DATABASE_URL
 * Vercel previews: skipped unless RUN_DB_MIGRATE_ON_PREVIEW=1
 *
 * PostgreSQL: session pooler (5432) first, then DIRECT_URL, then transaction pooler (6543).
 * Session pooler uses DATABASE_URL credentials — avoids stale DIRECT_URL auth on Hostinger.
 * db.*.supabase.co direct is often unreachable from Vercel CI.
 */
import { PrismaClient } from "@prisma/client";
import { buildPrismaEnv, resolvePostgresMigrateUrls } from "./load-database-url.mjs";
import {
  isPostgresDatabaseUrl,
  resolvePrismaSchemaPath,
} from "./resolve-prisma-schema.mjs";
import { runPrismaOrExit } from "./run-prisma.mjs";

function shouldSkipMigrate(env = process.env) {
  if (env.SKIP_DB_MIGRATE === "1") {
    console.log("[db-migrate] SKIP_DB_MIGRATE=1 — skipping");
    return true;
  }
  const url = buildPrismaEnv().DATABASE_URL?.trim();
  if (!url) {
    console.log("[db-migrate] DATABASE_URL unset — skipping");
    return true;
  }
  if (env.VERCEL === "1" && env.VERCEL_ENV !== "production" && env.RUN_DB_MIGRATE_ON_PREVIEW !== "1") {
    console.log(
      `[db-migrate] Vercel ${env.VERCEL_ENV ?? "unknown"} — skipping (set RUN_DB_MIGRATE_ON_PREVIEW=1 to override)`,
    );
    return true;
  }
  return false;
}

function isPoolCheckoutError(message) {
  return (
    message.includes("ECHECKOUTTIMEOUT") ||
    message.includes("connection pool") ||
    message.includes("P2024") ||
    message.includes("Timed out fetching")
  );
}

function isUnreachableDbError(message) {
  return (
    message.includes("Can't reach database server") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("EHOSTUNREACH")
  );
}

function isAuthDbError(message) {
  return (
    message.includes("Authentication failed") ||
    message.includes("password authentication failed") ||
    message.includes("P1000")
  );
}

function canTryNextMigrateUrl(message, index, total) {
  if (index >= total - 1) return false;
  return (
    isUnreachableDbError(message) ||
    isPoolCheckoutError(message) ||
    isAuthDbError(message)
  );
}

async function withPoolRetry(label, fn) {
  const delaysMs = [0, 15_000, 30_000];
  let lastError;
  for (let attempt = 0; attempt < delaysMs.length; attempt++) {
    if (delaysMs[attempt] > 0) {
      console.warn(
        `[db-migrate] ${label} pool busy — retry ${attempt + 1}/${delaysMs.length} in ${delaysMs[attempt] / 1000}s`,
      );
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
    }
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!isPoolCheckoutError(message) || attempt === delaysMs.length - 1) {
        throw error;
      }
    }
  }
  throw lastError;
}

async function postgresColumnExists(prisma, table, column) {
  const rows = await prisma.$queryRaw`
    SELECT 1 AS found
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
    LIMIT 1`;
  return Array.isArray(rows) && rows.length > 0;
}

async function postgresTableExists(prisma, table) {
  const rows = await prisma.$queryRaw`
    SELECT 1 AS found
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ${table}
    LIMIT 1`;
  return Array.isArray(rows) && rows.length > 0;
}

const SITE_THEME_EFFECT_SETTINGS_COLUMNS = [
  "cursorEffectSettings",
  "textEffectSettings",
  "motionSettings",
  "mobileBrowserConfig",
];

async function ensureSiteThemeEffectSettingsColumnsPostgres(prisma) {
  for (const column of SITE_THEME_EFFECT_SETTINGS_COLUMNS) {
    if (await postgresColumnExists(prisma, "SiteTheme", column)) {
      console.log(`[db-migrate] PostgreSQL: SiteTheme.${column} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SiteTheme" ADD COLUMN "${column}" JSONB NOT NULL DEFAULT '{}'`,
    );
    console.log(`[db-migrate] PostgreSQL: added SiteTheme.${column}`);
  }
}

async function ensureSiteThemeEffectSettingsColumnsMysql(prisma) {
  for (const column of SITE_THEME_EFFECT_SETTINGS_COLUMNS) {
    if (await mysqlColumnExists(prisma, "SiteTheme", column)) {
      console.log(`[db-migrate] MySQL: SiteTheme.${column} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`SiteTheme\` ADD COLUMN \`${column}\` JSON NOT NULL DEFAULT ('{}')`,
    );
    console.log(`[db-migrate] MySQL: added SiteTheme.${column}`);
  }
}

const CONTENT_ITEM_EXTRA_COLUMNS = [
  { name: "visualSettings", postgresSql: `JSONB NOT NULL DEFAULT '{}'`, mysqlSql: `JSON NOT NULL DEFAULT ('{}')` },
  { name: "scheduledAt", postgresSql: `TIMESTAMP(3)`, mysqlSql: `DATETIME(3) NULL` },
];

async function ensureContentItemExtraColumnsPostgres(prisma) {
  for (const column of CONTENT_ITEM_EXTRA_COLUMNS) {
    if (await postgresColumnExists(prisma, "ContentItem", column.name)) {
      console.log(`[db-migrate] PostgreSQL: ContentItem.${column.name} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ContentItem" ADD COLUMN "${column.name}" ${column.postgresSql}`,
    );
    console.log(`[db-migrate] PostgreSQL: added ContentItem.${column.name}`);
  }
}

async function ensureContentItemExtraColumnsMysql(prisma) {
  for (const column of CONTENT_ITEM_EXTRA_COLUMNS) {
    if (await mysqlColumnExists(prisma, "ContentItem", column.name)) {
      console.log(`[db-migrate] MySQL: ContentItem.${column.name} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`ContentItem\` ADD COLUMN \`${column.name}\` ${column.mysqlSql}`,
    );
    console.log(`[db-migrate] MySQL: added ContentItem.${column.name}`);
  }
}

async function ensureContentItemRevisionTablePostgres(prisma) {
  if (await postgresTableExists(prisma, "ContentItemRevision")) {
    console.log("[db-migrate] PostgreSQL: ContentItemRevision already exists");
    return;
  }
  await prisma.$executeRawUnsafe(`
    CREATE TABLE "ContentItemRevision" (
      "id" TEXT NOT NULL,
      "itemId" VARCHAR(36) NOT NULL,
      "version" INTEGER NOT NULL,
      "blocks" JSONB NOT NULL DEFAULT '[]',
      "message" VARCHAR(255),
      "status" "ContentStatus" NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ContentItemRevision_pkey" PRIMARY KEY ("id")
    )`);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX "ContentItemRevision_itemId_createdAt_idx"
    ON "ContentItemRevision"("itemId", "createdAt")`);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ContentItemRevision"
    ADD CONSTRAINT "ContentItemRevision_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "ContentItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE`);
  console.log("[db-migrate] PostgreSQL: created ContentItemRevision");
}

const CMS_PAGE_COMPOSITION_COLUMNS = [
  { table: "CmsPage", name: "composition" },
  { table: "CmsPageRevision", name: "composition" },
];

const POST_CONTENT_COMPOSITION_COLUMNS = [
  { table: "Post", name: "composition" },
  { table: "ContentItem", name: "composition" },
  { table: "ContentItemRevision", name: "composition" },
];

async function ensureCmsPageCompositionColumnsPostgres(prisma) {
  for (const { table, name } of CMS_PAGE_COMPOSITION_COLUMNS) {
    if (await postgresColumnExists(prisma, table, name)) {
      console.log(`[db-migrate] PostgreSQL: ${table}.${name} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD COLUMN "${name}" JSONB NOT NULL DEFAULT '{}'`,
    );
    console.log(`[db-migrate] PostgreSQL: added ${table}.${name}`);
  }
}

async function ensureCmsPageCompositionColumnsMysql(prisma) {
  for (const { table, name } of CMS_PAGE_COMPOSITION_COLUMNS) {
    if (await mysqlColumnExists(prisma, table, name)) {
      console.log(`[db-migrate] MySQL: ${table}.${name} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` JSON NOT NULL DEFAULT ('{}')`,
    );
    console.log(`[db-migrate] MySQL: added ${table}.${name}`);
  }
}

async function ensurePostContentCompositionColumnsPostgres(prisma) {
  for (const { table, name } of POST_CONTENT_COMPOSITION_COLUMNS) {
    if (await postgresColumnExists(prisma, table, name)) {
      console.log(`[db-migrate] PostgreSQL: ${table}.${name} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD COLUMN "${name}" JSONB NOT NULL DEFAULT '{}'`,
    );
    console.log(`[db-migrate] PostgreSQL: added ${table}.${name}`);
  }
}

async function ensurePostContentCompositionColumnsMysql(prisma) {
  for (const { table, name } of POST_CONTENT_COMPOSITION_COLUMNS) {
    if (await mysqlColumnExists(prisma, table, name)) {
      console.log(`[db-migrate] MySQL: ${table}.${name} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` JSON NOT NULL DEFAULT ('{}')`,
    );
    console.log(`[db-migrate] MySQL: added ${table}.${name}`);
  }
}

async function ensureContentItemRevisionTableMysql(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ContentItemRevision'`,
  );
  if (Number(rows[0]?.c ?? 0) > 0) {
    console.log("[db-migrate] MySQL: ContentItemRevision already exists");
    return;
  }
  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`ContentItemRevision\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`itemId\` VARCHAR(36) NOT NULL,
      \`version\` INTEGER NOT NULL,
      \`blocks\` JSON NOT NULL,
      \`message\` VARCHAR(255) NULL,
      \`status\` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`ContentItemRevision_itemId_createdAt_idx\`(\`itemId\`, \`createdAt\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE \`ContentItemRevision\`
    ADD CONSTRAINT \`ContentItemRevision_itemId_fkey\`
    FOREIGN KEY (\`itemId\`) REFERENCES \`ContentItem\`(\`id\`)
    ON DELETE CASCADE ON UPDATE CASCADE`);
  console.log("[db-migrate] MySQL: created ContentItemRevision");
}

async function mysqlColumnExists(prisma, table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function mysqlTableExists(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function mysqlUserTableCount(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_TYPE = 'BASE TABLE'
       AND TABLE_NAME <> '_prisma_migrations'`,
  );
  return Number(rows[0]?.c ?? 0);
}

async function shouldSkipMysqlMigrateDeploy(prisma) {
  const hasMigrationsTable = await mysqlTableExists(prisma, "_prisma_migrations");
  if (hasMigrationsTable) return false;
  const tableCount = await mysqlUserTableCount(prisma);
  return tableCount > 0;
}

async function applyPostgresPatches(prisma) {
  if (!(await postgresColumnExists(prisma, "SiteSettings", "publishedVersion"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SiteSettings" ADD COLUMN "publishedVersion" INTEGER NOT NULL DEFAULT 0`,
    );
    console.log("[db-migrate] PostgreSQL: added SiteSettings.publishedVersion");
  } else {
    console.log("[db-migrate] PostgreSQL: SiteSettings.publishedVersion already exists");
  }

  await ensureSiteThemeEffectSettingsColumnsPostgres(prisma);
  await ensureContentItemExtraColumnsPostgres(prisma);
  await ensureContentItemRevisionTablePostgres(prisma);
  await ensureCmsPageCompositionColumnsPostgres(prisma);
  await ensurePostContentCompositionColumnsPostgres(prisma);
}

async function fixHomePageLayout(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id FROM \`CmsPage\` WHERE \`slug\` = 'home'
     AND JSON_UNQUOTE(JSON_EXTRACT(\`composition\`, '$.layout.type'))
         IN ('right-sidebar','left-sidebar','three-column','split')`,
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("[db-migrate] MySQL: home page layout already full-width — skipped");
    return;
  }
  await prisma.$executeRawUnsafe(`
    UPDATE \`CmsPage\`
    SET \`composition\` = JSON_SET(
      \`composition\`,
      '$.layout.type', 'full',
      '$.regions.asideEnd', JSON_ARRAY(),
      '$.regions.asideStart', JSON_ARRAY()
    )
    WHERE \`slug\` = 'home'
  `);
  console.log(`[db-migrate] MySQL: fixed home page layout → full (${rows.length} row(s))`);
}

async function applyMysqlPatches(prisma) {
  if (!(await mysqlColumnExists(prisma, "SiteSettings", "publishedVersion"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `SiteSettings` ADD COLUMN `publishedVersion` INTEGER NOT NULL DEFAULT 0",
    );
    console.log("[db-migrate] MySQL: added SiteSettings.publishedVersion");
  } else {
    console.log("[db-migrate] MySQL: SiteSettings.publishedVersion already exists");
  }

  await ensureSiteThemeEffectSettingsColumnsMysql(prisma);
  await ensureContentItemExtraColumnsMysql(prisma);
  await ensureContentItemRevisionTableMysql(prisma);
  await ensureCmsPageCompositionColumnsMysql(prisma);
  await ensurePostContentCompositionColumnsMysql(prisma);
  await fixHomePageLayout(prisma);
}

async function runWithPrisma(url, fn) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function applyPostgresPatchesWithFallback(candidates) {
  let lastError;
  for (let i = 0; i < candidates.length; i++) {
    const { url, label } = candidates[i];
    console.log(`[db-migrate] PostgreSQL migrate connection: ${label}`);
    try {
      await withPoolRetry(label, () => runWithPrisma(url, applyPostgresPatches));
      console.log(`[db-migrate] PostgreSQL migrate succeeded via ${label}`);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const canTryNext = canTryNextMigrateUrl(message, i, candidates.length);
      console.warn(`[db-migrate] ${label} failed: ${message.split("\n")[0]}`);
      if (!canTryNext) throw error;
    }
  }
  throw lastError ?? new Error("No PostgreSQL migrate URL available");
}

async function main() {
  if (shouldSkipMigrate()) {
    return;
  }

  const env = buildPrismaEnv();
  const schema = resolvePrismaSchemaPath(env);
  const isPostgres = isPostgresDatabaseUrl(env.DATABASE_URL);

  console.log(`[db-migrate] Applying schema updates (${isPostgres ? "postgresql" : "mysql"})…`);

  if (isPostgres) {
    const candidates = resolvePostgresMigrateUrls(env);
    if (candidates.length === 0) {
      throw new Error("DATABASE_URL or DIRECT_URL required for PostgreSQL migrate");
    }
    if (candidates.length === 1 && candidates[0].label === "DATABASE_URL (transaction pooler)") {
      console.warn(
        "[db-migrate] Tip: set DIRECT_URL or use a Supabase pooler DATABASE_URL for session-mode migrate fallback.",
      );
    }

    await applyPostgresPatchesWithFallback(candidates);
    return;
  }

  const skipMysqlMigrateDeploy = await withPoolRetry("mysql", () =>
    runWithPrisma(env.DATABASE_URL, shouldSkipMysqlMigrateDeploy),
  );
  if (skipMysqlMigrateDeploy) {
    console.warn(
      "[db-migrate] MySQL baseline detected (existing tables without _prisma_migrations) — skipping `prisma migrate deploy` to avoid P3005.",
    );
    console.warn(
      "[db-migrate] To start tracking migrations, baseline this database and mark the initial migration as applied.",
    );
  } else {
    runPrismaOrExit(["migrate", "deploy", "--schema", schema], { env });
  }

  await withPoolRetry("mysql", () => runWithPrisma(env.DATABASE_URL, applyMysqlPatches));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[db-migrate] Failed:", message);
  if (isPoolCheckoutError(message) || isUnreachableDbError(message) || isAuthDbError(message)) {
    console.error(
      "[db-migrate] All migrate URLs failed. Ensure DATABASE_URL is correct; omit stale DIRECT_URL or sync its password. Or set SKIP_DB_MIGRATE=1.",
    );
  }
  process.exit(1);
});
