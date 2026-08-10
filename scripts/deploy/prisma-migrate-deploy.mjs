#!/usr/bin/env node
/**
 * Apply pending database schema changes during deploy.
 *
 * MySQL (Hostinger): prisma migrate deploy
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
import { ensurePrismaEnginesExecutable } from "./ensure-prisma-engines-executable.mjs";
import { buildPrismaEnv, resolvePostgresMigrateUrls } from "./load-database-url.mjs";
import {
  isPostgresDatabaseUrl,
  resolvePrismaSchemaPath,
} from "./resolve-prisma-schema.mjs";
import { runPrisma } from "./run-prisma.mjs";

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
  "themeProvenance",
  "backgroundEffectSettings",
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
  { table: "CmsPage", name: "visualSettings" },
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

async function mysqlEnumHasValue(prisma, table, column, value) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_TYPE AS t FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
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
       AND TABLE_NAME = 'MediaAsset'
       AND INDEX_NAME = 'MediaAsset_assetScope_idx'`,
  );
  if (Number(idx[0]?.c ?? 0) === 0) {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `MediaAsset_assetScope_idx` ON `MediaAsset`(`assetScope`)",
    );
    console.log("[db-migrate] MySQL: added MediaAsset_assetScope_idx");
  }
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
  await ensureEditorialMetadataColumnsMysql(prisma);
  await ensureSchemaUiFormsMysql(prisma);
  await ensureFaqSetCoverUrlMysql(prisma);
  await ensureMediaAssetScopeMysql(prisma);
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

  ensurePrismaEnginesExecutable();
  const migrateStatus = runPrisma(["migrate", "deploy", "--schema", schema], { env });
  if (migrateStatus !== 0) {
    console.warn(
      "[db-migrate] prisma migrate deploy exited with errors — continuing with idempotent MySQL patches",
    );
  }

  await withPoolRetry("mysql", () => runWithPrisma(env.DATABASE_URL, applyMysqlPatches));

  if (migrateStatus !== 0) {
    console.warn(
      "[db-migrate] migrate deploy had errors, but idempotent patches ran. Verify FormTemplate columns if issues persist.",
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
