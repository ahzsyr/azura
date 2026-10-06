#!/usr/bin/env node
/**
 * Apply pending database schema changes during deploy (MySQL 8.4 only).
 *
 * Skip: SKIP_DB_MIGRATE=1 or missing DATABASE_URL
 */
import { PrismaClient } from "@prisma/client";
import { ensurePrismaEnginesExecutable } from "./ensure-prisma-engines-executable.mjs";
import { buildPrismaEnv } from "./load-database-url.mjs";
import {
  assertMysqlDatabaseUrl,
  resolvePrismaMigrateSchemaPath,
  resolvePrismaSchemaPath,
} from "./resolve-prisma-schema.mjs";
import { runPrisma } from "./run-prisma.mjs";
import { ensureMarketingCampaignIntelligenceMysql } from "./ensure-marketing-campaign-intelligence.mjs";
import { ensureSearchFulltextMysql } from "./ensure-search-fulltext-mysql.mjs";

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
  "themeProvenance",
  "backgroundEffectSettings",
  "glassEffectSettings",
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
  if (!(await postgresColumnExists(prisma, "SiteTheme", "glassEffectEnabled"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SiteTheme" ADD COLUMN "glassEffectEnabled" BOOLEAN NOT NULL DEFAULT false`,
    );
    console.log(`[db-migrate] PostgreSQL: added SiteTheme.glassEffectEnabled`);
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
  if (!(await mysqlColumnExists(prisma, "SiteTheme", "glassEffectEnabled"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`SiteTheme\` ADD COLUMN \`glassEffectEnabled\` BOOLEAN NOT NULL DEFAULT false`,
    );
    console.log(`[db-migrate] MySQL: added SiteTheme.glassEffectEnabled`);
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
  { table: "CmsPage", name: "visualSettings" },
  { table: "CmsPageRevision", name: "composition" },
];

const POST_CONTENT_COMPOSITION_COLUMNS = [
  { table: "Post", name: "composition" },
  { table: "Post", name: "featuredImageSettings" },
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

/** Phase 4: durable search-index queue + lease columns (idempotent if migrate history drifted). */
async function ensureSearchIndexJobMysql(prisma) {
  if (await mysqlTableExists(prisma, "SearchIndexJob")) {
    console.log("[db-migrate] MySQL: SearchIndexJob already exists");
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`SearchIndexJob\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`entityType\` VARCHAR(32) NOT NULL,
        \`entityId\` VARCHAR(64) NOT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        \`attempts\` INTEGER NOT NULL DEFAULT 0,
        \`lastError\` TEXT NULL,
        \`lockedUntil\` DATETIME(3) NULL,
        \`startedAt\` DATETIME(3) NULL,
        \`completedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `SearchIndexJob_status_createdAt_idx` ON `SearchIndexJob`(`status`, `createdAt`)",
    );
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `SearchIndexJob_entityType_entityId_status_idx` ON `SearchIndexJob`(`entityType`, `entityId`, `status`)",
    );
    console.log("[db-migrate] MySQL: created SearchIndexJob");
  }

  if (await mysqlTableExists(prisma, "TranslationJob")) {
    if (!(await mysqlColumnExists(prisma, "TranslationJob", "attempts"))) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `TranslationJob` ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0",
      );
      console.log("[db-migrate] MySQL: added TranslationJob.attempts");
    }
    if (!(await mysqlColumnExists(prisma, "TranslationJob", "lockedUntil"))) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `TranslationJob` ADD COLUMN `lockedUntil` DATETIME(3) NULL",
      );
      console.log("[db-migrate] MySQL: added TranslationJob.lockedUntil");
    }
  }

  if (await mysqlTableExists(prisma, "MarketingJob")) {
    if (!(await mysqlColumnExists(prisma, "MarketingJob", "lockedUntil"))) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `MarketingJob` ADD COLUMN `lockedUntil` DATETIME(3) NULL",
      );
      console.log("[db-migrate] MySQL: added MarketingJob.lockedUntil");
    }
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
      \`composition\` JSON NOT NULL DEFAULT ('{}'),
      \`translations\` JSON NOT NULL DEFAULT ('[]'),
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

async function mysqlIndexExists(prisma, table, indexName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) = LOWER(?)
       AND INDEX_NAME = ?`,
    table,
    indexName,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function ensureMysqlIndex(prisma, table, indexName, columnsSql) {
  if (await mysqlIndexExists(prisma, table, indexName)) {
    console.log(`[db-migrate] MySQL: index ${indexName} already exists`);
    return;
  }
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`${indexName}\` ON \`${table}\`(${columnsSql})`,
  );
  console.log(`[db-migrate] MySQL: added index ${indexName}`);
}

/**
 * Safety net for Phase 2 CMS revision pointers
 * (prisma/migrations/20261004120000_cms_revision_pointers).
 */
async function ensureCmsRevisionPointersMysql(prisma) {
  const pointerTables = ["CmsPage", "Post", "ContentItem"];
  for (const table of pointerTables) {
    if (!(await mysqlTableExists(prisma, table))) {
      console.log(`[db-migrate] MySQL: ${table} missing — skip revision pointers`);
      continue;
    }
    await ensureMysqlColumn(prisma, table, "workingRevisionId", "VARCHAR(191) NULL");
    await ensureMysqlColumn(prisma, table, "publishedRevisionId", "VARCHAR(191) NULL");
    await ensureMysqlIndex(
      prisma,
      table,
      `${table}_workingRevisionId_idx`,
      "`workingRevisionId`",
    );
    await ensureMysqlIndex(
      prisma,
      table,
      `${table}_publishedRevisionId_idx`,
      "`publishedRevisionId`",
    );
  }

  if (!(await mysqlTableExists(prisma, "PostRevision"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`PostRevision\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`postId\` VARCHAR(191) NOT NULL,
        \`version\` INTEGER NOT NULL,
        \`blocks\` JSON NOT NULL,
        \`composition\` JSON NOT NULL DEFAULT ('{}'),
        \`translations\` JSON NOT NULL DEFAULT ('[]'),
        \`message\` VARCHAR(191) NULL,
        \`createdById\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`PostRevision_postId_idx\`(\`postId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`PostRevision\`
        ADD CONSTRAINT \`PostRevision_postId_fkey\`
        FOREIGN KEY (\`postId\`) REFERENCES \`Post\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {}
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`PostRevision\`
        ADD CONSTRAINT \`PostRevision_createdById_fkey\`
        FOREIGN KEY (\`createdById\`) REFERENCES \`User\`(\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE`);
    } catch {}
    console.log("[db-migrate] MySQL: created PostRevision");
  } else {
    console.log("[db-migrate] MySQL: PostRevision already exists");
  }

  // Backfill pointers when columns were empty (idempotent).
  if (await mysqlTableExists(prisma, "CmsPageRevision")) {
    await prisma.$executeRawUnsafe(`
      UPDATE \`CmsPage\` p
      SET
        \`workingRevisionId\` = COALESCE(
          \`workingRevisionId\`,
          (SELECT r.\`id\` FROM \`CmsPageRevision\` r
           WHERE r.\`pageId\` = p.\`id\`
           ORDER BY r.\`version\` DESC LIMIT 1)
        ),
        \`publishedRevisionId\` = CASE
          WHEN p.\`publishedRevisionId\` IS NOT NULL THEN p.\`publishedRevisionId\`
          WHEN p.\`status\` = 'PUBLISHED' THEN (
            SELECT r.\`id\` FROM \`CmsPageRevision\` r
            WHERE r.\`pageId\` = p.\`id\`
            ORDER BY r.\`version\` DESC LIMIT 1
          )
          ELSE NULL
        END
      WHERE EXISTS (SELECT 1 FROM \`CmsPageRevision\` r WHERE r.\`pageId\` = p.\`id\`)`);
  }

  if (await mysqlTableExists(prisma, "ContentItemRevision")) {
    await prisma.$executeRawUnsafe(`
      UPDATE \`ContentItem\` i
      SET
        \`workingRevisionId\` = COALESCE(
          \`workingRevisionId\`,
          (SELECT r.\`id\` FROM \`ContentItemRevision\` r
           WHERE r.\`itemId\` = i.\`id\`
           ORDER BY r.\`version\` DESC LIMIT 1)
        ),
        \`publishedRevisionId\` = CASE
          WHEN i.\`publishedRevisionId\` IS NOT NULL THEN i.\`publishedRevisionId\`
          WHEN i.\`status\` = 'PUBLISHED' THEN (
            SELECT r.\`id\` FROM \`ContentItemRevision\` r
            WHERE r.\`itemId\` = i.\`id\`
            ORDER BY r.\`version\` DESC LIMIT 1
          )
          ELSE NULL
        END
      WHERE EXISTS (SELECT 1 FROM \`ContentItemRevision\` r WHERE r.\`itemId\` = i.\`id\`)`);
  }
}

/**
 * Safety net for Phase 3 revision translation snapshots
 * (prisma/migrations/20261004180000_revision_translation_snapshots).
 */
async function ensureRevisionTranslationSnapshotsMysql(prisma) {
  const targets = [
    "CmsPageRevision",
    "PostRevision",
    "ContentItemRevision",
  ];
  for (const table of targets) {
    if (!(await mysqlTableExists(prisma, table))) {
      console.log(`[db-migrate] MySQL: ${table} missing — skip translations column`);
      continue;
    }
    await ensureMysqlColumn(
      prisma,
      table,
      "translations",
      "JSON NOT NULL DEFAULT ('[]')",
    );
  }
}

async function mysqlColumnExists(prisma, table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) = LOWER(?)
       AND LOWER(COLUMN_NAME) = LOWER(?)`,
    table,
    column,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function mysqlTableExists(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?)`,
    table,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

/** Prisma MySQL migrations require InnoDB (FKs + long unique indexes). */
async function ensureMysqlInnoDBDefault(prisma) {
  await prisma.$executeRawUnsafe("SET SESSION default_storage_engine = 'InnoDB'");
  try {
    await prisma.$executeRawUnsafe("SET GLOBAL default_storage_engine = 'InnoDB'");
    console.log("[db-migrate] MySQL: default_storage_engine → InnoDB");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[db-migrate] MySQL: could not SET GLOBAL default_storage_engine=InnoDB (${message.split("\n")[0]}). Session is InnoDB; set it in my.cnf if new tables stay MyISAM.`,
    );
  }
}

async function ensureMysqlTablesInnoDB(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME AS name
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_TYPE = 'BASE TABLE'
       AND UPPER(COALESCE(ENGINE, '')) <> 'INNODB'
     ORDER BY TABLE_NAME`,
  );
  for (const row of rows) {
    const name = String(row.name ?? "");
    if (!name) continue;
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${name}\` ENGINE=InnoDB`);
    console.log(`[db-migrate] MySQL: converted ${name} → InnoDB`);
  }
  if (!rows.length) {
    console.log("[db-migrate] MySQL: all tables already InnoDB");
  }
}

async function mysqlEnumHasValue(prisma, table, column, value) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_TYPE AS t FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) = LOWER(?)
       AND LOWER(COLUMN_NAME) = LOWER(?)`,
    table,
    column,
  );
  const type = String(rows[0]?.t ?? "");
  return type.includes(`'${value}'`);
}

/** Safety net when migrate history is behind the live schema UI forms release. */
async function ensureSchemaUiFormsMysql(prisma) {
  const submissionColumns = [
    { name: "pipelineType", sql: "VARCHAR(64) NULL" },
    { name: "assigneeId", sql: "VARCHAR(36) NULL" },
    { name: "tags", sql: "JSON NOT NULL DEFAULT ('[]')" },
    { name: "customerId", sql: "VARCHAR(36) NULL" },
    { name: "companyId", sql: "VARCHAR(36) NULL" },
    { name: "campaignId", sql: "VARCHAR(36) NULL" },
    { name: "metadata", sql: "JSON NOT NULL DEFAULT ('{}')" },
  ];
  for (const column of submissionColumns) {
    if (await mysqlColumnExists(prisma, "FormSubmission", column.name)) {
      console.log(`[db-migrate] MySQL: FormSubmission.${column.name} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`FormSubmission\` ADD COLUMN \`${column.name}\` ${column.sql}`,
    );
    console.log(`[db-migrate] MySQL: added FormSubmission.${column.name}`);
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX \`FormSubmission_assigneeId_idx\` ON \`FormSubmission\`(\`assigneeId\`)`,
    );
  } catch {
    /* index may already exist */
  }
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX \`FormSubmission_pipelineType_idx\` ON \`FormSubmission\`(\`pipelineType\`)`,
    );
  } catch {
    /* index may already exist */
  }

  if (!(await mysqlColumnExists(prisma, "FormTemplate", "publishedVersion"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`FormTemplate\` ADD COLUMN \`publishedVersion\` INT NULL`,
    );
    console.log("[db-migrate] MySQL: added FormTemplate.publishedVersion");
  } else {
    console.log("[db-migrate] MySQL: FormTemplate.publishedVersion already exists");
  }

  if (!(await mysqlColumnExists(prisma, "FormTemplate", "allowedAdminIds"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`FormTemplate\` ADD COLUMN \`allowedAdminIds\` JSON NOT NULL DEFAULT ('[]')`,
    );
    console.log("[db-migrate] MySQL: added FormTemplate.allowedAdminIds");
  } else {
    console.log("[db-migrate] MySQL: FormTemplate.allowedAdminIds already exists");
  }

  if (!(await mysqlColumnExists(prisma, "FormTemplate", "definitionRaw"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`FormTemplate\` ADD COLUMN \`definitionRaw\` JSON NULL`,
    );
    console.log("[db-migrate] MySQL: added FormTemplate.definitionRaw");
  } else {
    console.log("[db-migrate] MySQL: FormTemplate.definitionRaw already exists");
  }

  if (!(await mysqlTableExists(prisma, "FormTemplateSnapshot"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`FormTemplateSnapshot\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`templateId\` VARCHAR(191) NOT NULL,
        \`version\` INT NOT NULL,
        \`label\` VARCHAR(128) NULL,
        \`definition\` JSON NOT NULL,
        \`publishedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`createdById\` VARCHAR(36) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`FormTemplateSnapshot_templateId_version_key\`(\`templateId\`, \`version\`),
        INDEX \`FormTemplateSnapshot_templateId_publishedAt_idx\`(\`templateId\`, \`publishedAt\`),
        CONSTRAINT \`FormTemplateSnapshot_templateId_fkey\`
          FOREIGN KEY (\`templateId\`) REFERENCES \`FormTemplate\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created FormTemplateSnapshot");
  } else {
    console.log("[db-migrate] MySQL: FormTemplateSnapshot already exists");
  }

  if (!(await mysqlTableExists(prisma, "InteractionEvent"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`InteractionEvent\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`aggregateId\` VARCHAR(36) NOT NULL,
        \`type\` VARCHAR(64) NOT NULL,
        \`payload\` JSON NOT NULL DEFAULT ('{}'),
        \`metadata\` JSON NOT NULL DEFAULT ('{}'),
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`InteractionEvent_aggregateId_createdAt_idx\`(\`aggregateId\`, \`createdAt\`),
        INDEX \`InteractionEvent_type_createdAt_idx\`(\`type\`, \`createdAt\`),
        CONSTRAINT \`InteractionEvent_aggregateId_fkey\`
          FOREIGN KEY (\`aggregateId\`) REFERENCES \`FormSubmission\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created InteractionEvent");
  } else {
    console.log("[db-migrate] MySQL: InteractionEvent already exists");
  }

  if (!(await mysqlTableExists(prisma, "FormBehaviorEvent"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`FormBehaviorEvent\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`schemaId\` VARCHAR(36) NOT NULL,
        \`sessionId\` VARCHAR(64) NULL,
        \`bindingId\` VARCHAR(64) NULL,
        \`type\` VARCHAR(64) NOT NULL,
        \`payload\` JSON NOT NULL DEFAULT ('{}'),
        \`metadata\` JSON NOT NULL DEFAULT ('{}'),
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`FormBehaviorEvent_schemaId_createdAt_idx\`(\`schemaId\`, \`createdAt\`),
        INDEX \`FormBehaviorEvent_type_createdAt_idx\`(\`type\`, \`createdAt\`),
        INDEX \`FormBehaviorEvent_sessionId_idx\`(\`sessionId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created FormBehaviorEvent");
  } else {
    console.log("[db-migrate] MySQL: FormBehaviorEvent already exists");
  }

  if (!(await mysqlEnumHasValue(prisma, "FormTemplate", "category", "SURVEY"))) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`FormTemplate\`
        MODIFY COLUMN \`category\`
        ENUM('LEAD', 'CONTACT', 'MULTI_STEP', 'GENERAL', 'SURVEY')
        NOT NULL DEFAULT 'GENERAL'`);
    console.log("[db-migrate] MySQL: added SURVEY to FormTemplate.category");
  } else {
    console.log("[db-migrate] MySQL: FormTemplate.category already includes SURVEY");
  }
}

const EDITORIAL_METADATA_COLUMNS = [
  { table: "CmsPage", name: "authorId", postgresSql: `TEXT`, mysqlSql: `VARCHAR(191) NULL` },
  { table: "CmsPage", name: "sources", postgresSql: `JSONB NOT NULL DEFAULT '[]'`, mysqlSql: `JSON NOT NULL DEFAULT ('[]')` },
  { table: "Post", name: "sources", postgresSql: `JSONB NOT NULL DEFAULT '[]'`, mysqlSql: `JSON NOT NULL DEFAULT ('[]')` },
  { table: "ContentItem", name: "authorId", postgresSql: `TEXT`, mysqlSql: `VARCHAR(36) NULL` },
  { table: "ContentItem", name: "sources", postgresSql: `JSONB NOT NULL DEFAULT '[]'`, mysqlSql: `JSON NOT NULL DEFAULT ('[]')` },
];

async function ensureEditorialMetadataColumnsPostgres(prisma) {
  for (const column of EDITORIAL_METADATA_COLUMNS) {
    if (await postgresColumnExists(prisma, column.table, column.name)) {
      console.log(`[db-migrate] PostgreSQL: ${column.table}.${column.name} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${column.table}" ADD COLUMN "${column.name}" ${column.postgresSql}`,
    );
    console.log(`[db-migrate] PostgreSQL: added ${column.table}.${column.name}`);
  }
}

async function ensureEditorialMetadataColumnsMysql(prisma) {
  for (const column of EDITORIAL_METADATA_COLUMNS) {
    if (await mysqlColumnExists(prisma, column.table, column.name)) {
      console.log(`[db-migrate] MySQL: ${column.table}.${column.name} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${column.table}\` ADD COLUMN \`${column.name}\` ${column.mysqlSql}`,
    );
    console.log(`[db-migrate] MySQL: added ${column.table}.${column.name}`);
  }
}

async function ensureFaqSetCoverUrlPostgres(prisma) {
  if (await postgresColumnExists(prisma, "FaqSet", "coverUrl")) {
    console.log("[db-migrate] PostgreSQL: FaqSet.coverUrl already exists");
    return;
  }
  await prisma.$executeRawUnsafe(`ALTER TABLE "FaqSet" ADD COLUMN "coverUrl" TEXT`);
  console.log("[db-migrate] PostgreSQL: added FaqSet.coverUrl");
}

async function ensureFaqSetCoverUrlMysql(prisma) {
  if (!(await mysqlColumnExists(prisma, "FaqSet", "coverUrl"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`FaqSet\` ADD COLUMN \`coverUrl\` TEXT NULL`);
    console.log("[db-migrate] MySQL: added FaqSet.coverUrl");
    return;
  }
  // Widen legacy VARCHAR(191) so long CDN/media URLs persist.
  await prisma.$executeRawUnsafe(`ALTER TABLE \`FaqSet\` MODIFY \`coverUrl\` TEXT NULL`);
  console.log("[db-migrate] MySQL: ensured FaqSet.coverUrl is TEXT");
}

async function ensureMediaAssetScopeMysql(prisma) {
  if (!(await mysqlColumnExists(prisma, "MediaAsset", "assetScope"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `MediaAsset` ADD COLUMN `assetScope` VARCHAR(16) NOT NULL DEFAULT 'CMS'",
    );
    console.log("[db-migrate] MySQL: added MediaAsset.assetScope");
  } else {
    console.log("[db-migrate] MySQL: MediaAsset.assetScope already exists");
  }
  const idx = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) = 'mediaasset'
       AND INDEX_NAME = 'MediaAsset_assetScope_idx'`,
  );
  if (Number(idx[0]?.c ?? 0) === 0) {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `MediaAsset_assetScope_idx` ON `MediaAsset`(`assetScope`)",
    );
    console.log("[db-migrate] MySQL: added MediaAsset_assetScope_idx");
  }
}

/**
 * Safety net when migrate history lags Phase 4 storage identity
 * (`storageBackend` + `bucket` + `objectKey`). Mirrors
 * prisma/migrations/20261004200000_media_asset_storage_identity.
 */
async function ensureMediaAssetStorageIdentityMysql(prisma) {
  if (!(await mysqlTableExists(prisma, "MediaAsset"))) {
    console.log("[db-migrate] MySQL: MediaAsset missing — skip storage identity patch");
    return;
  }

  const added = [];
  if (!(await mysqlColumnExists(prisma, "MediaAsset", "storageBackend"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `MediaAsset` ADD COLUMN `storageBackend` VARCHAR(16) NOT NULL DEFAULT 'local'",
    );
    added.push("storageBackend");
  }
  if (!(await mysqlColumnExists(prisma, "MediaAsset", "bucket"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `MediaAsset` ADD COLUMN `bucket` VARCHAR(128) NOT NULL DEFAULT 'local'",
    );
    added.push("bucket");
  }
  if (!(await mysqlColumnExists(prisma, "MediaAsset", "objectKey"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `MediaAsset` ADD COLUMN `objectKey` VARCHAR(512) NOT NULL DEFAULT ''",
    );
    added.push("objectKey");
  }
  if (added.length) {
    console.log(`[db-migrate] MySQL: added MediaAsset.${added.join(", ")}`);
  } else {
    console.log("[db-migrate] MySQL: MediaAsset storage identity columns already exist");
  }

  // Backfill from denormalized url when objectKey is empty (legacy rows).
  await prisma.$executeRawUnsafe(`
    UPDATE \`MediaAsset\`
    SET
      \`storageBackend\` = 'local',
      \`bucket\` = 'local',
      \`objectKey\` = TRIM(LEADING '/' FROM SUBSTRING(\`url\`, LENGTH('/uploads/') + 1))
    WHERE \`url\` LIKE '/uploads/%'
      AND (\`objectKey\` = '' OR \`objectKey\` IS NULL)`);
  await prisma.$executeRawUnsafe(`
    UPDATE \`MediaAsset\`
    SET
      \`storageBackend\` = 'supabase',
      \`bucket\` = SUBSTRING_INDEX(SUBSTRING_INDEX(\`url\`, '/storage/v1/object/public/', -1), '/', 1),
      \`objectKey\` = SUBSTRING(
        SUBSTRING_INDEX(\`url\`, '/storage/v1/object/public/', -1),
        LOCATE('/', SUBSTRING_INDEX(\`url\`, '/storage/v1/object/public/', -1)) + 1
      )
    WHERE \`url\` LIKE '%/storage/v1/object/public/%'
      AND (\`objectKey\` = '' OR \`objectKey\` IS NULL)`);
  await prisma.$executeRawUnsafe(`
    UPDATE \`MediaAsset\`
    SET
      \`storageBackend\` = IF(\`storageBackend\` = '', 'local', \`storageBackend\`),
      \`bucket\` = IF(\`bucket\` = '', 'local', \`bucket\`),
      \`objectKey\` = CONCAT('legacy/', \`id\`)
    WHERE \`objectKey\` = '' OR \`objectKey\` IS NULL`);

  // Widen url for long CDN URLs (migration also MODIFYs to TEXT).
  await prisma.$executeRawUnsafe(`ALTER TABLE \`MediaAsset\` MODIFY COLUMN \`url\` TEXT NOT NULL`);

  // MyISAM caps unique keys at 1000 bytes; storage identity needs InnoDB.
  const engineRows = await prisma.$queryRawUnsafe(
    `SELECT ENGINE AS engine FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'mediaasset'`,
  );
  const engine = String(engineRows[0]?.engine ?? "").toUpperCase();
  if (engine && engine !== "INNODB") {
    await prisma.$executeRawUnsafe("ALTER TABLE `MediaAsset` ENGINE=InnoDB");
    console.log(`[db-migrate] MySQL: converted MediaAsset from ${engine} to InnoDB`);
  }

  const uniq = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) = 'mediaasset'
       AND INDEX_NAME = 'MediaAsset_storageBackend_bucket_objectKey_key'`,
  );
  if (Number(uniq[0]?.c ?? 0) === 0) {
    await prisma.$executeRawUnsafe(
      "CREATE UNIQUE INDEX `MediaAsset_storageBackend_bucket_objectKey_key` ON `MediaAsset`(`storageBackend`, `bucket`, `objectKey`)",
    );
    console.log("[db-migrate] MySQL: added MediaAsset_storageBackend_bucket_objectKey_key");
  }
}

/** Safety net for Hostinger when migrate history lags security-hardening release. */
async function ensureSecurityHardeningMysql(prisma) {
  if (!(await mysqlColumnExists(prisma, "User", "sessionVersion"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `User` ADD COLUMN `sessionVersion` INT NOT NULL DEFAULT 0",
    );
    console.log("[db-migrate] MySQL: added User.sessionVersion");
  }
  if (!(await mysqlColumnExists(prisma, "User", "totpSecret"))) {
    await prisma.$executeRawUnsafe("ALTER TABLE `User` ADD COLUMN `totpSecret` TEXT NULL");
    console.log("[db-migrate] MySQL: added User.totpSecret");
  }
  if (!(await mysqlColumnExists(prisma, "User", "totpEnabled"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `User` ADD COLUMN `totpEnabled` BOOLEAN NOT NULL DEFAULT false",
    );
    console.log("[db-migrate] MySQL: added User.totpEnabled");
  }
  if (!(await mysqlColumnExists(prisma, "MediaAsset", "visibility"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `MediaAsset` ADD COLUMN `visibility` ENUM('PUBLIC','GATED','PRIVATE') NOT NULL DEFAULT 'PUBLIC'",
    );
    console.log("[db-migrate] MySQL: added MediaAsset.visibility");
  }
  if (!(await mysqlTableExists(prisma, "MfaRecoveryCode"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MfaRecoveryCode\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`codeHash\` VARCHAR(64) NOT NULL,
        \`usedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`MfaRecoveryCode_userId_idx\`(\`userId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`MfaRecoveryCode\`
        ADD CONSTRAINT \`MfaRecoveryCode_userId_fkey\`
        FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {
      /* fk may already exist */
    }
    console.log("[db-migrate] MySQL: created MfaRecoveryCode");
  }
  if (!(await mysqlTableExists(prisma, "RateLimitBucket"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`RateLimitBucket\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`bucketKey\` VARCHAR(191) NOT NULL,
        \`windowStart\` DATETIME(3) NOT NULL,
        \`count\` INT NOT NULL DEFAULT 0,
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`RateLimitBucket_bucketKey_key\`(\`bucketKey\`),
        INDEX \`RateLimitBucket_windowStart_idx\`(\`windowStart\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created RateLimitBucket");
  }
  if (!(await mysqlTableExists(prisma, "SecurityAuditLog"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`SecurityAuditLog\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`action\` VARCHAR(64) NOT NULL,
        \`actorId\` VARCHAR(36) NULL,
        \`actorRole\` VARCHAR(32) NULL,
        \`ip\` VARCHAR(64) NULL,
        \`meta\` JSON NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`SecurityAuditLog_action_createdAt_idx\`(\`action\`, \`createdAt\`),
        INDEX \`SecurityAuditLog_actorId_createdAt_idx\`(\`actorId\`, \`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created SecurityAuditLog");
  }
  if (!(await mysqlEnumHasValue(prisma, "User", "role", "SUPER_ADMIN"))) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`User\`
        MODIFY COLUMN \`role\`
        ENUM('ADMIN', 'CUSTOMER', 'SUPER_ADMIN')
        NOT NULL DEFAULT 'CUSTOMER'`);
    console.log("[db-migrate] MySQL: added SUPER_ADMIN to User.role");
  } else {
    console.log("[db-migrate] MySQL: User.role already includes SUPER_ADMIN");
  }
}

/** P1–P3 auth lifecycle columns/tables when migrate history was not applied on Hostinger. */
async function ensureAuthLifecycleMysql(prisma) {
  if (!(await mysqlColumnExists(prisma, "User", "disabledAt"))) {
    await prisma.$executeRawUnsafe("ALTER TABLE `User` ADD COLUMN `disabledAt` DATETIME(3) NULL");
    console.log("[db-migrate] MySQL: added User.disabledAt");
  }
  if (!(await mysqlColumnExists(prisma, "User", "lockedUntil"))) {
    await prisma.$executeRawUnsafe("ALTER TABLE `User` ADD COLUMN `lockedUntil` DATETIME(3) NULL");
    console.log("[db-migrate] MySQL: added User.lockedUntil");
  }
  if (!(await mysqlColumnExists(prisma, "User", "failedLoginCount"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `User` ADD COLUMN `failedLoginCount` INT NOT NULL DEFAULT 0",
    );
    console.log("[db-migrate] MySQL: added User.failedLoginCount");
  }

  const hadEmailVerified = await mysqlColumnExists(prisma, "User", "emailVerifiedAt");
  if (!hadEmailVerified) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `User` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL",
    );
    console.log("[db-migrate] MySQL: added User.emailVerifiedAt");
  }
  if (!(await mysqlColumnExists(prisma, "User", "pendingEmail"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `User` ADD COLUMN `pendingEmail` VARCHAR(191) NULL",
    );
    console.log("[db-migrate] MySQL: added User.pendingEmail");
  }
  // Grandfather existing rows so login is not blocked after column add
  await prisma.$executeRawUnsafe(
    "UPDATE `User` SET `emailVerifiedAt` = `createdAt` WHERE `emailVerifiedAt` IS NULL",
  );
  console.log("[db-migrate] MySQL: grandfathered User.emailVerifiedAt");

  if (!(await mysqlColumnExists(prisma, "User", "mustChangePassword"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `User` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false",
    );
    console.log("[db-migrate] MySQL: added User.mustChangePassword");
  }

  if (!(await mysqlTableExists(prisma, "EmailVerificationToken"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`EmailVerificationToken\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`purpose\` ENUM('SIGNUP_VERIFY', 'EMAIL_CHANGE') NOT NULL,
        \`tokenHash\` VARCHAR(191) NOT NULL,
        \`expiresAt\` DATETIME(3) NOT NULL,
        \`usedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`EmailVerificationToken_userId_purpose_idx\`(\`userId\`, \`purpose\`),
        INDEX \`EmailVerificationToken_expiresAt_idx\`(\`expiresAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`EmailVerificationToken\`
        ADD CONSTRAINT \`EmailVerificationToken_userId_fkey\`
        FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {
      /* fk may already exist */
    }
    console.log("[db-migrate] MySQL: created EmailVerificationToken");
  }

  if (!(await mysqlTableExists(prisma, "AdminInviteToken"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`AdminInviteToken\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`tokenHash\` VARCHAR(191) NOT NULL,
        \`expiresAt\` DATETIME(3) NOT NULL,
        \`usedAt\` DATETIME(3) NULL,
        \`invitedById\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`AdminInviteToken_userId_idx\`(\`userId\`),
        INDEX \`AdminInviteToken_expiresAt_idx\`(\`expiresAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`AdminInviteToken\`
        ADD CONSTRAINT \`AdminInviteToken_userId_fkey\`
        FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {
      /* fk may already exist */
    }
    console.log("[db-migrate] MySQL: created AdminInviteToken");
  }

  // Promote oldest ADMIN → SUPER_ADMIN when none exists
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE \`User\`
      SET \`role\` = 'SUPER_ADMIN'
      WHERE \`id\` = (
        SELECT \`id\` FROM (
          SELECT \`id\` FROM \`User\`
          WHERE \`role\` = 'ADMIN'
          ORDER BY \`createdAt\` ASC
          LIMIT 1
        ) AS \`oldest\`
      )
      AND NOT EXISTS (
        SELECT 1 FROM (
          SELECT \`id\` FROM \`User\` WHERE \`role\` = 'SUPER_ADMIN' LIMIT 1
        ) AS \`existing_super\`
      )`);
    console.log("[db-migrate] MySQL: ensured SUPER_ADMIN bootstrap (if needed)");
  } catch (error) {
    console.warn("[db-migrate] MySQL: SUPER_ADMIN bootstrap skipped:", error?.message ?? error);
  }
}

async function ensureEmailOtpMysql(prisma) {
  if (await mysqlTableExists(prisma, "EmailOtpToken")) {
    console.log("[db-migrate] MySQL: EmailOtpToken already exists");
    return;
  }
  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`EmailOtpToken\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`purpose\` ENUM('SIGNUP_VERIFY', 'ADMIN_LOGIN') NOT NULL,
      \`codeHash\` VARCHAR(64) NOT NULL,
      \`expiresAt\` DATETIME(3) NOT NULL,
      \`usedAt\` DATETIME(3) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`EmailOtpToken_userId_purpose_idx\`(\`userId\`, \`purpose\`),
      INDEX \`EmailOtpToken_expiresAt_idx\`(\`expiresAt\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`EmailOtpToken\`
      ADD CONSTRAINT \`EmailOtpToken_userId_fkey\`
      FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE`);
  } catch {
    /* fk may already exist */
  }
  console.log("[db-migrate] MySQL: created EmailOtpToken");
}

async function ensureSecurityHardeningPostgres(prisma) {
  if (!(await postgresColumnExists(prisma, "User", "sessionVersion"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0`,
    );
    console.log("[db-migrate] PostgreSQL: added User.sessionVersion");
  }
  if (!(await postgresColumnExists(prisma, "User", "totpSecret"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT`);
    console.log("[db-migrate] PostgreSQL: added User.totpSecret");
  }
  if (!(await postgresColumnExists(prisma, "User", "totpEnabled"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false`,
    );
    console.log("[db-migrate] PostgreSQL: added User.totpEnabled");
  }
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'GATED', 'PRIVATE');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
  if (!(await postgresColumnExists(prisma, "MediaAsset", "visibility"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "MediaAsset" ADD COLUMN "visibility" "MediaVisibility" NOT NULL DEFAULT 'PUBLIC'`,
    );
    console.log("[db-migrate] PostgreSQL: added MediaAsset.visibility");
  }
  if (!(await postgresTableExists(prisma, "MfaRecoveryCode"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "MfaRecoveryCode" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "codeHash" VARCHAR(64) NOT NULL,
        "usedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode"("userId")`,
    );
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "MfaRecoveryCode"
      ADD CONSTRAINT "MfaRecoveryCode_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE`);
    console.log("[db-migrate] PostgreSQL: created MfaRecoveryCode");
  }
  if (!(await postgresTableExists(prisma, "RateLimitBucket"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "RateLimitBucket" (
        "id" TEXT NOT NULL,
        "bucketKey" VARCHAR(191) NOT NULL,
        "windowStart" TIMESTAMP(3) NOT NULL,
        "count" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX "RateLimitBucket_bucketKey_key" ON "RateLimitBucket"("bucketKey")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart")`,
    );
    console.log("[db-migrate] PostgreSQL: created RateLimitBucket");
  }
  if (!(await postgresTableExists(prisma, "SecurityAuditLog"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "SecurityAuditLog" (
        "id" TEXT NOT NULL,
        "action" VARCHAR(64) NOT NULL,
        "actorId" VARCHAR(36),
        "actorRole" VARCHAR(32),
        "ip" VARCHAR(64),
        "meta" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX "SecurityAuditLog_action_createdAt_idx" ON "SecurityAuditLog"("action", "createdAt")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX "SecurityAuditLog_actorId_createdAt_idx" ON "SecurityAuditLog"("actorId", "createdAt")`,
    );
    console.log("[db-migrate] PostgreSQL: created SecurityAuditLog");
  }
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
  console.log("[db-migrate] PostgreSQL: ensured SUPER_ADMIN on UserRole");
}

async function ensureMediaAssetScopePostgres(prisma) {
  if (!(await postgresColumnExists(prisma, "MediaAsset", "assetScope"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "MediaAsset" ADD COLUMN "assetScope" VARCHAR(16) NOT NULL DEFAULT 'CMS'`,
    );
    console.log("[db-migrate] PostgreSQL: added MediaAsset.assetScope");
  } else {
    console.log("[db-migrate] PostgreSQL: MediaAsset.assetScope already exists");
  }
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "MediaAsset_assetScope_idx" ON "MediaAsset" ("assetScope")`,
  );
}

async function ensureMarketingIntegrationsPostgres(prisma) {
  if (await postgresTableExists(prisma, "MarketingProviderRuntime")) {
    if (!(await postgresTableExists(prisma, "MarketingProviderAppConfig"))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketingProviderAppConfig" (
          "id" TEXT NOT NULL,
          "providerId" VARCHAR(64) NOT NULL,
          "clientId" VARCHAR(256),
          "clientSecret" TEXT,
          "appSecret" TEXT,
          "webhookVerifyToken" TEXT,
          "pixelId" VARCHAR(128),
          "capiAccessToken" TEXT,
          "metadata" JSONB NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MarketingProviderAppConfig_pkey" PRIMARY KEY ("id")
        )`);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "MarketingProviderAppConfig_providerId_key"
        ON "MarketingProviderAppConfig" ("providerId")`);
      console.log("[db-migrate] PostgreSQL: added MarketingProviderAppConfig");
    } else {
      console.log("[db-migrate] PostgreSQL: marketing tables already present");
    }
    return;
  }
  if (!(await postgresTableExists(prisma, "MarketingProviderRuntime"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingProviderRuntime" (
        "id" TEXT NOT NULL,
        "providerId" VARCHAR(64) NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "installedVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
        "lifecycle" VARCHAR(32) NOT NULL DEFAULT 'discovered',
        "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
        "lastSyncAt" TIMESTAMP(3),
        "healthSummary" TEXT,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingProviderRuntime_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingProviderRuntime_providerId_key"
      ON "MarketingProviderRuntime" ("providerId")`);
    console.log("[db-migrate] PostgreSQL: created MarketingProviderRuntime");
  }
  if (!(await postgresTableExists(prisma, "MarketingConnection"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingConnection" (
        "id" TEXT NOT NULL,
        "providerId" VARCHAR(64) NOT NULL,
        "tenantId" VARCHAR(64) NOT NULL DEFAULT 'default',
        "status" VARCHAR(32) NOT NULL DEFAULT 'disconnected',
        "lifecycle" VARCHAR(32) NOT NULL DEFAULT 'configured',
        "oauthMetadata" JSONB NOT NULL DEFAULT '{}',
        "scopesGranted" JSONB NOT NULL DEFAULT '[]',
        "scopesRequired" JSONB NOT NULL DEFAULT '[]',
        "scopesMissing" JSONB NOT NULL DEFAULT '[]',
        "scopesExpired" JSONB NOT NULL DEFAULT '[]',
        "lastHealthAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingConnection_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingConnection_providerId_tenantId_key"
      ON "MarketingConnection" ("providerId", "tenantId")`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MarketingConnection_status_idx"
      ON "MarketingConnection" ("status")`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MarketingConnection_lifecycle_idx"
      ON "MarketingConnection" ("lifecycle")`);
    console.log("[db-migrate] PostgreSQL: created MarketingConnection");
  }
  if (!(await postgresTableExists(prisma, "MarketingCredential"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingCredential" (
        "id" TEXT NOT NULL,
        "connectionId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "tokenType" VARCHAR(32),
        "expiresAt" TIMESTAMP(3),
        "refreshStatus" VARCHAR(32) NOT NULL DEFAULT 'ok',
        "sealedPayload" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingCredential_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCredential_connectionId_key"
      ON "MarketingCredential" ("connectionId")`);
    console.log("[db-migrate] PostgreSQL: created MarketingCredential");
  }
  if (!(await postgresTableExists(prisma, "MarketingPermissionState"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingPermissionState" (
        "id" TEXT NOT NULL,
        "providerId" VARCHAR(64) NOT NULL,
        "connectionId" VARCHAR(64) NOT NULL,
        "entries" JSONB NOT NULL DEFAULT '[]',
        "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingPermissionState_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingPermissionState_providerId_connectionId_key"
      ON "MarketingPermissionState" ("providerId", "connectionId")`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MarketingPermissionState_lastCheckedAt_idx"
      ON "MarketingPermissionState" ("lastCheckedAt")`);
    console.log("[db-migrate] PostgreSQL: created MarketingPermissionState");
  }
  if (!(await postgresTableExists(prisma, "MarketingAccount"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingAccount" (
        "id" TEXT NOT NULL,
        "connectionId" TEXT NOT NULL,
        "externalAccountId" VARCHAR(128) NOT NULL,
        "accountType" VARCHAR(64) NOT NULL,
        "displayName" VARCHAR(256) NOT NULL,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "isSelected" BOOLEAN NOT NULL DEFAULT false,
        "healthSummary" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingAccount_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingAccount_connectionId_externalAccountId_key"
      ON "MarketingAccount" ("connectionId", "externalAccountId")`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MarketingAccount_accountType_idx"
      ON "MarketingAccount" ("accountType")`);
    console.log("[db-migrate] PostgreSQL: created MarketingAccount");
  }
  if (!(await postgresTableExists(prisma, "MarketingProviderAppConfig"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingProviderAppConfig" (
        "id" TEXT NOT NULL,
        "providerId" VARCHAR(64) NOT NULL,
        "clientId" VARCHAR(256),
        "clientSecret" TEXT,
        "appSecret" TEXT,
        "webhookVerifyToken" TEXT,
        "pixelId" VARCHAR(128),
        "capiAccessToken" TEXT,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingProviderAppConfig_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingProviderAppConfig_providerId_key"
      ON "MarketingProviderAppConfig" ("providerId")`);
    console.log("[db-migrate] PostgreSQL: created MarketingProviderAppConfig");
  }
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingConnection_providerId_fkey') THEN
        ALTER TABLE "MarketingConnection"
          ADD CONSTRAINT "MarketingConnection_providerId_fkey"
          FOREIGN KEY ("providerId") REFERENCES "MarketingProviderRuntime"("providerId")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingCredential_connectionId_fkey') THEN
        ALTER TABLE "MarketingCredential"
          ADD CONSTRAINT "MarketingCredential_connectionId_fkey"
          FOREIGN KEY ("connectionId") REFERENCES "MarketingConnection"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingAccount_connectionId_fkey') THEN
        ALTER TABLE "MarketingAccount"
          ADD CONSTRAINT "MarketingAccount_connectionId_fkey"
          FOREIGN KEY ("connectionId") REFERENCES "MarketingConnection"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;`);
  console.log("[db-migrate] PostgreSQL: ensured core marketing integrations schema");
}

async function ensureMarketingProviderAppConfigMysql(prisma) {
  if (await mysqlTableExists(prisma, "MarketingProviderAppConfig")) {
    console.log("[db-migrate] MySQL: MarketingProviderAppConfig already exists");
    return;
  }
  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`MarketingProviderAppConfig\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`providerId\` VARCHAR(64) NOT NULL,
      \`clientId\` VARCHAR(256) NULL,
      \`clientSecret\` TEXT NULL,
      \`appSecret\` TEXT NULL,
      \`webhookVerifyToken\` TEXT NULL,
      \`pixelId\` VARCHAR(128) NULL,
      \`capiAccessToken\` TEXT NULL,
      \`metadata\` JSON NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingProviderAppConfig_providerId_key\`(\`providerId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log("[db-migrate] MySQL: created MarketingProviderAppConfig");
}

async function ensureMarketingFoundationMysql(prisma) {
  if (!(await mysqlTableExists(prisma, "MarketingProviderRuntime"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingProviderRuntime\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`enabled\` BOOLEAN NOT NULL DEFAULT true,
        \`installedVersion\` VARCHAR(32) NOT NULL DEFAULT '1.0.0',
        \`lifecycle\` VARCHAR(32) NOT NULL DEFAULT 'discovered',
        \`maintenanceMode\` BOOLEAN NOT NULL DEFAULT false,
        \`lastSyncAt\` DATETIME(3) NULL,
        \`healthSummary\` TEXT NULL,
        \`metadata\` JSON NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingProviderRuntime_providerId_key\`(\`providerId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingProviderRuntime");
  }
  if (!(await mysqlTableExists(prisma, "MarketingConnection"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingConnection\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`tenantId\` VARCHAR(64) NOT NULL DEFAULT 'default',
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'disconnected',
        \`lifecycle\` VARCHAR(32) NOT NULL DEFAULT 'configured',
        \`oauthMetadata\` JSON NOT NULL,
        \`scopesGranted\` JSON NOT NULL,
        \`scopesRequired\` JSON NOT NULL,
        \`scopesMissing\` JSON NOT NULL,
        \`scopesExpired\` JSON NOT NULL,
        \`lastHealthAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingConnection_providerId_tenantId_key\`(\`providerId\`, \`tenantId\`),
        INDEX \`MarketingConnection_status_idx\`(\`status\`),
        INDEX \`MarketingConnection_lifecycle_idx\`(\`lifecycle\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingConnection");
  }
  if (!(await mysqlTableExists(prisma, "MarketingCredential"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingCredential\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`connectionId\` VARCHAR(191) NOT NULL,
        \`accessToken\` TEXT NOT NULL,
        \`refreshToken\` TEXT NULL,
        \`tokenType\` VARCHAR(32) NULL,
        \`expiresAt\` DATETIME(3) NULL,
        \`refreshStatus\` VARCHAR(32) NOT NULL DEFAULT 'ok',
        \`sealedPayload\` JSON NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingCredential_connectionId_key\`(\`connectionId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingCredential");
  }
  if (!(await mysqlTableExists(prisma, "MarketingPermissionState"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingPermissionState\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`connectionId\` VARCHAR(64) NOT NULL,
        \`entries\` JSON NOT NULL,
        \`lastCheckedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingPermissionState_providerId_connectionId_key\`(\`providerId\`, \`connectionId\`),
        INDEX \`MarketingPermissionState_lastCheckedAt_idx\`(\`lastCheckedAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingPermissionState");
  }
  if (!(await mysqlTableExists(prisma, "MarketingAccount"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingAccount\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`connectionId\` VARCHAR(191) NOT NULL,
        \`externalAccountId\` VARCHAR(128) NOT NULL,
        \`accountType\` VARCHAR(64) NOT NULL,
        \`displayName\` VARCHAR(256) NOT NULL,
        \`metadata\` JSON NOT NULL,
        \`isSelected\` BOOLEAN NOT NULL DEFAULT false,
        \`healthSummary\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingAccount_connectionId_externalAccountId_key\`(\`connectionId\`, \`externalAccountId\`),
        INDEX \`MarketingAccount_accountType_idx\`(\`accountType\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingAccount");
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`MarketingConnection\`
      ADD CONSTRAINT \`MarketingConnection_providerId_fkey\`
      FOREIGN KEY (\`providerId\`) REFERENCES \`MarketingProviderRuntime\`(\`providerId\`)
      ON DELETE CASCADE ON UPDATE CASCADE`);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`MarketingCredential\`
      ADD CONSTRAINT \`MarketingCredential_connectionId_fkey\`
      FOREIGN KEY (\`connectionId\`) REFERENCES \`MarketingConnection\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE`);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`MarketingAccount\`
      ADD CONSTRAINT \`MarketingAccount_connectionId_fkey\`
      FOREIGN KEY (\`connectionId\`) REFERENCES \`MarketingConnection\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE`);
  } catch {}
}

async function ensureMysqlColumn(prisma, table, column, definition) {
  if (await mysqlColumnExists(prisma, table, column)) {
    console.log(`[db-migrate] MySQL: ${table}.${column} already exists`);
    return;
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
  );
  console.log(`[db-migrate] MySQL: added ${table}.${column}`);
}

/** Tracking + job tables used by Marketing admin (Hostinger skips prisma/migrations). */
async function ensureMarketingTrackingMysql(prisma) {
  if (!(await mysqlTableExists(prisma, "MarketingTrackingConfig"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingTrackingConfig\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`enabled\` BOOLEAN NOT NULL DEFAULT false,
        \`pixelId\` VARCHAR(128) NULL,
        \`capiEnabled\` BOOLEAN NOT NULL DEFAULT false,
        \`accessToken\` TEXT NULL,
        \`testEventCode\` VARCHAR(128) NULL,
        \`mappings\` JSON NOT NULL DEFAULT ('{}'),
        \`metadata\` JSON NOT NULL DEFAULT ('{}'),
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingTrackingConfig_providerId_key\`(\`providerId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingTrackingConfig");
  } else {
    await ensureMysqlColumn(prisma, "MarketingTrackingConfig", "mappings", "JSON NOT NULL DEFAULT ('{}')");
    await ensureMysqlColumn(prisma, "MarketingTrackingConfig", "metadata", "JSON NOT NULL DEFAULT ('{}')");
    await ensureMysqlColumn(prisma, "MarketingTrackingConfig", "pixelId", "VARCHAR(128) NULL");
    await ensureMysqlColumn(prisma, "MarketingTrackingConfig", "capiEnabled", "BOOLEAN NOT NULL DEFAULT false");
    await ensureMysqlColumn(prisma, "MarketingTrackingConfig", "accessToken", "TEXT NULL");
    await ensureMysqlColumn(prisma, "MarketingTrackingConfig", "testEventCode", "VARCHAR(128) NULL");
    console.log("[db-migrate] MySQL: MarketingTrackingConfig already exists");
  }

  if (!(await mysqlTableExists(prisma, "MarketingJob"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingJob\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NULL,
        \`connectionId\` VARCHAR(191) NULL,
        \`accountId\` VARCHAR(191) NULL,
        \`jobType\` VARCHAR(64) NOT NULL,
        \`workflowStage\` VARCHAR(64) NOT NULL DEFAULT 'queued',
        \`payload\` JSON NOT NULL DEFAULT ('{}'),
        \`result\` JSON NOT NULL DEFAULT ('{}'),
        \`idempotencyKey\` VARCHAR(191) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        \`attemptCount\` INT NOT NULL DEFAULT 0,
        \`maxAttempts\` INT NOT NULL DEFAULT 5,
        \`lastError\` TEXT NULL,
        \`scheduledAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`startedAt\` DATETIME(3) NULL,
        \`completedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingJob_idempotencyKey_key\`(\`idempotencyKey\`),
        INDEX \`MarketingJob_status_scheduledAt_idx\`(\`status\`, \`scheduledAt\`),
        INDEX \`MarketingJob_jobType_status_idx\`(\`jobType\`, \`status\`),
        INDEX \`MarketingJob_providerId_status_idx\`(\`providerId\`, \`status\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingJob");
  }

  if (!(await mysqlTableExists(prisma, "MarketingWebhookEvent"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingWebhookEvent\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`eventType\` VARCHAR(128) NOT NULL,
        \`externalEventId\` VARCHAR(191) NULL,
        \`signatureValid\` BOOLEAN NOT NULL DEFAULT false,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
        \`rawPayload\` JSON NOT NULL DEFAULT ('{}'),
        \`normalizedPayload\` JSON NOT NULL DEFAULT ('{}'),
        \`processingError\` TEXT NULL,
        \`attemptCount\` INT NOT NULL DEFAULT 0,
        \`receivedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`processedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingWebhookEvent_providerId_externalEventId_key\`(\`providerId\`, \`externalEventId\`),
        INDEX \`MarketingWebhookEvent_providerId_status_idx\`(\`providerId\`, \`status\`),
        INDEX \`MarketingWebhookEvent_externalEventId_idx\`(\`externalEventId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingWebhookEvent");
  }

  if (!(await mysqlTableExists(prisma, "MarketingAnalyticsSnapshot"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingAnalyticsSnapshot\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`accountId\` VARCHAR(128) NOT NULL,
        \`metric\` VARCHAR(64) NOT NULL,
        \`value\` DOUBLE NOT NULL DEFAULT 0,
        \`periodStart\` DATETIME(3) NOT NULL,
        \`periodEnd\` DATETIME(3) NOT NULL,
        \`dimensions\` JSON NOT NULL DEFAULT ('{}'),
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingAnalyticsSnapshot_metric_period_key\`(\`providerId\`, \`accountId\`, \`metric\`, \`periodStart\`, \`periodEnd\`),
        INDEX \`MarketingAnalyticsSnapshot_providerId_periodStart_idx\`(\`providerId\`, \`periodStart\`),
        INDEX \`MarketingAnalyticsSnapshot_metric_periodStart_idx\`(\`metric\`, \`periodStart\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingAnalyticsSnapshot");
  }

  if (!(await mysqlTableExists(prisma, "MarketingLeadEvent"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingLeadEvent\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`externalLeadId\` VARCHAR(191) NOT NULL,
        \`formId\` VARCHAR(128) NULL,
        \`payload\` JSON NOT NULL DEFAULT ('{}'),
        \`canonical\` JSON NOT NULL DEFAULT ('{}'),
        \`inquiryId\` VARCHAR(64) NULL,
        \`processingStatus\` VARCHAR(32) NOT NULL DEFAULT 'pending',
        \`idempotencyKey\` VARCHAR(191) NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingLeadEvent_idempotencyKey_key\`(\`idempotencyKey\`),
        UNIQUE INDEX \`MarketingLeadEvent_providerId_externalLeadId_key\`(\`providerId\`, \`externalLeadId\`),
        INDEX \`MarketingLeadEvent_processingStatus_idx\`(\`processingStatus\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingLeadEvent");
  }

  if (!(await mysqlTableExists(prisma, "MarketingTelemetry"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`MarketingTelemetry\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`operation\` VARCHAR(128) NOT NULL,
        \`durationMs\` INT NOT NULL DEFAULT 0,
        \`retryCount\` INT NOT NULL DEFAULT 0,
        \`rateLimited\` BOOLEAN NOT NULL DEFAULT false,
        \`queueWaitMs\` INT NULL,
        \`outcome\` VARCHAR(16) NOT NULL,
        \`errorCategory\` VARCHAR(64) NULL,
        \`metadata\` JSON NOT NULL DEFAULT ('{}'),
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`MarketingTelemetry_providerId_createdAt_idx\`(\`providerId\`, \`createdAt\`),
        INDEX \`MarketingTelemetry_outcome_createdAt_idx\`(\`outcome\`, \`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log("[db-migrate] MySQL: created MarketingTelemetry");
  }

  // Ads metrics columns on MarketingAccount (campaign intelligence)
  if (await mysqlTableExists(prisma, "MarketingAccount")) {
    await ensureMysqlColumn(prisma, "MarketingAccount", "currency", "VARCHAR(8) NULL");
    await ensureMysqlColumn(prisma, "MarketingAccount", "spend", "DOUBLE NOT NULL DEFAULT 0");
    await ensureMysqlColumn(prisma, "MarketingAccount", "impressions", "DOUBLE NOT NULL DEFAULT 0");
    await ensureMysqlColumn(prisma, "MarketingAccount", "clicks", "DOUBLE NOT NULL DEFAULT 0");
    await ensureMysqlColumn(prisma, "MarketingAccount", "conversions", "DOUBLE NOT NULL DEFAULT 0");
    await ensureMysqlColumn(prisma, "MarketingAccount", "lastSyncAt", "DATETIME(3) NULL");
  }
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
  await ensureEditorialMetadataColumnsPostgres(prisma);
  await ensureFaqSetCoverUrlPostgres(prisma);
  await ensureMediaAssetScopePostgres(prisma);
  await ensureMarketingIntegrationsPostgres(prisma);
  // PostgreSQL campaign intelligence removed — Azura is MySQL-only.
  await ensureSecurityHardeningPostgres(prisma);
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

async function runMysqlPatch(label, fn) {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[db-migrate] MySQL patch "${label}" failed: ${message.split("\n")[0]}`);
  }
}

async function applyMysqlPatches(prisma) {
  await runMysqlPatch("innodbDefault", () => ensureMysqlInnoDBDefault(prisma));
  await runMysqlPatch("innodbTables", () => ensureMysqlTablesInnoDB(prisma));

  await runMysqlPatch("SiteSettings.publishedVersion", async () => {
    if (!(await mysqlTableExists(prisma, "SiteSettings"))) {
      console.log("[db-migrate] MySQL: SiteSettings missing — skip publishedVersion patch");
      return;
    }
    if (!(await mysqlColumnExists(prisma, "SiteSettings", "publishedVersion"))) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `SiteSettings` ADD COLUMN `publishedVersion` INTEGER NOT NULL DEFAULT 0",
      );
      console.log("[db-migrate] MySQL: added SiteSettings.publishedVersion");
    } else {
      console.log("[db-migrate] MySQL: SiteSettings.publishedVersion already exists");
    }
  });

  await runMysqlPatch("siteThemeEffects", () => ensureSiteThemeEffectSettingsColumnsMysql(prisma));
  await runMysqlPatch("contentItemExtra", () => ensureContentItemExtraColumnsMysql(prisma));
  await runMysqlPatch("contentItemRevision", () => ensureContentItemRevisionTableMysql(prisma));
  await runMysqlPatch("cmsPageComposition", () => ensureCmsPageCompositionColumnsMysql(prisma));
  await runMysqlPatch("postContentComposition", () => ensurePostContentCompositionColumnsMysql(prisma));
  await runMysqlPatch("cmsRevisionPointers", () => ensureCmsRevisionPointersMysql(prisma));
  await runMysqlPatch("revisionTranslationSnapshots", () =>
    ensureRevisionTranslationSnapshotsMysql(prisma),
  );
  await runMysqlPatch("editorialMetadata", () => ensureEditorialMetadataColumnsMysql(prisma));
  await runMysqlPatch("schemaUiForms", () => ensureSchemaUiFormsMysql(prisma));
  await runMysqlPatch("faqSetCoverUrl", () => ensureFaqSetCoverUrlMysql(prisma));
  await runMysqlPatch("mediaAssetScope", () => ensureMediaAssetScopeMysql(prisma));
  await runMysqlPatch("mediaAssetStorageIdentity", () => ensureMediaAssetStorageIdentityMysql(prisma));
  await runMysqlPatch("marketingFoundation", () => ensureMarketingFoundationMysql(prisma));
  await runMysqlPatch("marketingProviderAppConfig", () => ensureMarketingProviderAppConfigMysql(prisma));
  await runMysqlPatch("marketingTracking", () => ensureMarketingTrackingMysql(prisma));
  await runMysqlPatch("marketingCampaignIntelligence", () => ensureMarketingCampaignIntelligenceMysql(prisma));
  await runMysqlPatch("searchFulltext", () => ensureSearchFulltextMysql(prisma));
  await runMysqlPatch("searchIndexJob", () => ensureSearchIndexJobMysql(prisma));
  await runMysqlPatch("securityHardening", () => ensureSecurityHardeningMysql(prisma));
  await runMysqlPatch("authLifecycle", () => ensureAuthLifecycleMysql(prisma));
  await runMysqlPatch("emailOtp", () => ensureEmailOtpMysql(prisma));
  await runMysqlPatch("fixHomePageLayout", () => fixHomePageLayout(prisma));
}

async function runWithPrisma(url, fn) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function isUserTablePresent(url) {
  return runWithPrisma(url, async (prisma) => mysqlTableExists(prisma, "User"));
}

/** Empty first-install DBs: migrate deploy can fail; db push bootstraps core tables. */
function bootstrapSchemaWithDbPush(schema, env, label) {
  console.log(`[db-migrate] ${label} — bootstrapping schema with prisma db push…`);
  const status = runPrisma(["db", "push", "--schema", schema, "--skip-generate"], { env });
  if (status !== 0) {
    console.error(`[db-migrate] prisma db push failed (exit ${status})`);
  }
  return status === 0;
}

async function applyPostgresPatchesWithFallback(candidates) {
  let lastError;
  for (let i = 0; i < candidates.length; i++) {
    const { url, label } = candidates[i];
    console.log(`[db-migrate] PostgreSQL migrate connection: ${label}`);
    try {
      await withPoolRetry(label, () => runWithPrisma(url, applyPostgresPatches));
      console.log(`[db-migrate] PostgreSQL migrate succeeded via ${label}`);
      return url;
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
  assertMysqlDatabaseUrl(env.DATABASE_URL);
  const datamodelSchema = resolvePrismaSchemaPath(env);
  const migrateSchema = resolvePrismaMigrateSchemaPath(env);

  console.log("[db-migrate] Applying schema updates (mysql)…");
  console.log(`[db-migrate] migrate schema: ${migrateSchema}; datamodel: ${datamodelSchema}`);

  ensurePrismaEnginesExecutable();
  // Prefer InnoDB before migrate deploy creates tables (MyISAM breaks FKs / long unique keys).
  await runWithPrisma(env.DATABASE_URL, ensureMysqlInnoDBDefault).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[db-migrate] InnoDB preflight skipped: ${message.split("\n")[0]}`);
  });
  const userPresent = await isUserTablePresent(env.DATABASE_URL);
  const prismaMigrationsPresent = await runWithPrisma(env.DATABASE_URL, (prisma) =>
    mysqlTableExists(prisma, "_prisma_migrations"),
  );
  let migrateStatus = 0;
  if (userPresent && !prismaMigrationsPresent) {
    console.log(
      "[db-migrate] Existing MySQL schema without _prisma_migrations — skipping migrate deploy (P3005), applying patches",
    );
  } else {
    migrateStatus = runPrisma(["migrate", "deploy", "--schema", migrateSchema], { env });
  }
  if (migrateStatus !== 0) {
    console.warn(
      "[db-migrate] prisma migrate deploy exited with errors — will try db push bootstrap if needed, then patches",
    );
  }

  // Re-check after migrate — empty DBs may have been bootstrapped by migrate deploy.
  const userPresentAfterMigrate = await isUserTablePresent(env.DATABASE_URL);
  if (!userPresentAfterMigrate) {
    // db push uses the full datamodel; SeoSearchMetric unique needs prefix indexes from migrations.
    // Prefer a second migrate attempt after a clean DB; push is last-resort bootstrap only.
    const pushed = bootstrapSchemaWithDbPush(
      datamodelSchema,
      env,
      "User table missing after migrate deploy",
    );
    if (!pushed || !(await isUserTablePresent(env.DATABASE_URL))) {
      throw new Error(
        "MySQL schema missing (User table). Run npm run deploy:hostinger-db or import database/mysql/import-blank-full.sql. Do not set SKIP_DB_MIGRATE=1 on an empty database.",
      );
    }
  }

  await withPoolRetry("mysql", () => runWithPrisma(env.DATABASE_URL, applyMysqlPatches));

  if (migrateStatus !== 0) {
    console.warn(
      "[db-migrate] migrate deploy had errors, but schema bootstrap/patches ran. Verify tables if issues persist.",
    );
  }
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
