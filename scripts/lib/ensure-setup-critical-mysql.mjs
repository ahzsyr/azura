/**
 * Additive MySQL patches for tables/columns that POST /api/setup/complete writes.
 * Safe on live Hostinger DBs: CREATE IF NOT EXISTS, ADD COLUMN, rename only when the
 * old name exists and the new name does not. Never DROP TABLE / DROP COLUMN of catalog data.
 */

async function tableExists(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?)`,
    table,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function columnExists(prisma, table, column) {
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

async function indexExists(prisma, table, indexName) {
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

async function ensureColumn(prisma, table, column, definition, log = console.log) {
  if (!(await tableExists(prisma, table))) return;
  if (await columnExists(prisma, table, column)) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  log(`[setup-schema] added ${table}.${column}`);
}

async function ensureIndex(prisma, table, indexName, columnsSql, unique = false, log = console.log) {
  if (!(await tableExists(prisma, table))) return;
  if (await indexExists(prisma, table, indexName)) return;
  const kind = unique ? "UNIQUE INDEX" : "INDEX";
  await prisma.$executeRawUnsafe(
    `CREATE ${kind} \`${indexName}\` ON \`${table}\`(${columnsSql})`,
  );
  log(`[setup-schema] added ${kind} ${indexName} on ${table}`);
}

/**
 * Rename column when the old name exists and the new name does not.
 * Keeps stored values (CHANGE COLUMN).
 */
async function renameColumnIfNeeded(prisma, table, from, to, definition, log = console.log) {
  if (!(await tableExists(prisma, table))) return;
  const hasNew = await columnExists(prisma, table, to);
  const hasOld = await columnExists(prisma, table, from);
  if (hasNew) return;
  if (!hasOld) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN \`${to}\` ${definition}`);
    log(`[setup-schema] added ${table}.${to} (no legacy ${from})`);
    return;
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${table}\` CHANGE COLUMN \`${from}\` \`${to}\` ${definition}`,
  );
  log(`[setup-schema] renamed ${table}.${from} → ${to}`);
}

async function ensureEntityTranslationMysql(prisma, log = console.log) {
  if (!(await tableExists(prisma, "EntityTranslation"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`EntityTranslation\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`entityType\` VARCHAR(64) NOT NULL,
        \`entityId\` VARCHAR(36) NOT NULL,
        \`field\` VARCHAR(64) NOT NULL,
        \`localeCode\` VARCHAR(16) NOT NULL,
        \`value\` TEXT NOT NULL,
        \`version\` INTEGER NOT NULL DEFAULT 1,
        \`status\` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        INDEX \`EntityTranslation_entityType_entityId_idx\`(\`entityType\`, \`entityId\`),
        INDEX \`EntityTranslation_localeCode_entityType_idx\`(\`localeCode\`, \`entityType\`),
        INDEX \`EntityTranslation_entityType_localeCode_status_idx\`(\`entityType\`, \`localeCode\`, \`status\`),
        UNIQUE INDEX \`EntityTranslation_entityType_entityId_field_localeCode_key\`(\`entityType\`, \`entityId\`, \`field\`, \`localeCode\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    log("[setup-schema] created EntityTranslation");
    return;
  }

  await renameColumnIfNeeded(
    prisma,
    "EntityTranslation",
    "languageCode",
    "localeCode",
    "VARCHAR(16) NOT NULL",
    log,
  );
  await ensureColumn(prisma, "EntityTranslation", "version", "INTEGER NOT NULL DEFAULT 1", log);
  await ensureColumn(
    prisma,
    "EntityTranslation",
    "status",
    "ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED'",
    log,
  );

  // Unique index required for Prisma compound upsert used by setup.
  if (!(await indexExists(prisma, "EntityTranslation", "EntityTranslation_entityType_entityId_field_localeCode_key"))) {
    // Drop legacy unique if present (name still references languageCode).
    if (await indexExists(prisma, "EntityTranslation", "EntityTranslation_entityType_entityId_field_languageCode_key")) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `EntityTranslation` DROP INDEX `EntityTranslation_entityType_entityId_field_languageCode_key`",
      );
    }
    await ensureIndex(
      prisma,
      "EntityTranslation",
      "EntityTranslation_entityType_entityId_field_localeCode_key",
      "`entityType`, `entityId`, `field`, `localeCode`",
      true,
      log,
    );
  }
  await ensureIndex(
    prisma,
    "EntityTranslation",
    "EntityTranslation_entityType_entityId_idx",
    "`entityType`, `entityId`",
    false,
    log,
  );
  await ensureIndex(
    prisma,
    "EntityTranslation",
    "EntityTranslation_localeCode_entityType_idx",
    "`localeCode`, `entityType`",
    false,
    log,
  );
}

async function ensureLocalizedSlugMysql(prisma, log = console.log) {
  if (!(await tableExists(prisma, "LocalizedSlug"))) return;
  await renameColumnIfNeeded(
    prisma,
    "LocalizedSlug",
    "languageCode",
    "localeCode",
    "VARCHAR(16) NOT NULL",
    log,
  );
}

async function ensureSiteThemeMysql(prisma, log = console.log) {
  if (!(await tableExists(prisma, "SiteTheme"))) return;
  const columns = [
    ["siteDefaultPresetId", "VARCHAR(191) NULL"],
    ["activePresetId", "VARCHAR(191) NULL"],
    ["primaryColor", "VARCHAR(191) NOT NULL DEFAULT '#047857'"],
    ["secondaryColor", "VARCHAR(191) NOT NULL DEFAULT '#d4af37'"],
    ["typography", "JSON NOT NULL DEFAULT ('{}')"],
    ["faviconUrl", "VARCHAR(191) NULL"],
    ["logoUrl", "VARCHAR(191) NULL"],
    ["brandConfig", "JSON NOT NULL DEFAULT ('{}')"],
    ["headerConfig", "JSON NOT NULL DEFAULT ('{}')"],
    ["footerConfig", "JSON NOT NULL DEFAULT ('{}')"],
    ["animationsEnabled", "BOOLEAN NOT NULL DEFAULT true"],
    ["animationSpeed", "DOUBLE NOT NULL DEFAULT 1"],
    ["lazyLoadEnabled", "BOOLEAN NOT NULL DEFAULT true"],
    ["darkModeEnabled", "BOOLEAN NOT NULL DEFAULT false"],
    ["spacingScale", "DOUBLE NOT NULL DEFAULT 1"],
    ["customCss", "TEXT NULL"],
    ["cursorEffect", "VARCHAR(191) NULL"],
    ["backgroundEffect", "VARCHAR(191) NULL"],
    ["textEffect", "VARCHAR(191) NULL"],
    ["cursorEffectEnabled", "BOOLEAN NOT NULL DEFAULT true"],
    ["backgroundEffectEnabled", "BOOLEAN NOT NULL DEFAULT true"],
    ["textEffectEnabled", "BOOLEAN NOT NULL DEFAULT true"],
    ["glassEffectEnabled", "BOOLEAN NOT NULL DEFAULT false"],
    ["backgroundEffectSettings", "JSON NOT NULL DEFAULT ('{}')"],
    ["cursorEffectSettings", "JSON NOT NULL DEFAULT ('{}')"],
    ["textEffectSettings", "JSON NOT NULL DEFAULT ('{}')"],
    ["glassEffectSettings", "JSON NOT NULL DEFAULT ('{}')"],
    ["motionSettings", "JSON NOT NULL DEFAULT ('{}')"],
    ["cardStyle", "VARCHAR(191) NULL"],
    ["borderStyle", "VARCHAR(191) NULL"],
    ["themeProvenance", "JSON NOT NULL DEFAULT ('{}')"],
    ["mobileBrowserConfig", "JSON NOT NULL DEFAULT ('{}')"],
  ];
  for (const [name, definition] of columns) {
    await ensureColumn(prisma, "SiteTheme", name, definition, log);
  }
}

async function ensureCmsPageMysql(prisma, log = console.log) {
  if (!(await tableExists(prisma, "CmsPage"))) return;
  await ensureColumn(prisma, "CmsPage", "composition", "JSON NOT NULL DEFAULT ('{}')", log);
  await ensureColumn(prisma, "CmsPage", "visualSettings", "JSON NOT NULL DEFAULT ('{}')", log);
  await ensureColumn(prisma, "CmsPage", "blocks", "JSON NOT NULL DEFAULT ('[]')", log);
  await ensureColumn(prisma, "CmsPage", "templateKey", "VARCHAR(191) NULL", log);
  await ensureColumn(prisma, "CmsPage", "publishedAt", "DATETIME(3) NULL", log);
  await ensureColumn(prisma, "CmsPage", "scheduledAt", "DATETIME(3) NULL", log);
  await ensureColumn(prisma, "CmsPage", "workingRevisionId", "VARCHAR(191) NULL", log);
  await ensureColumn(prisma, "CmsPage", "publishedRevisionId", "VARCHAR(191) NULL", log);
  await ensureColumn(prisma, "CmsPage", "authorId", "VARCHAR(191) NULL", log);
}

async function ensureLocaleConfigMysql(prisma, log = console.log) {
  if (!(await tableExists(prisma, "LocaleConfig"))) return;
  const columns = [
    ["htmlLang", "VARCHAR(10) NOT NULL DEFAULT 'en'"],
    ["dir", "VARCHAR(3) NOT NULL DEFAULT 'ltr'"],
    ["flag", "VARCHAR(191) NOT NULL DEFAULT '🌐'"],
    ["dateLocale", "VARCHAR(16) NOT NULL DEFAULT 'en-US'"],
    ["currency", "VARCHAR(3) NOT NULL DEFAULT 'USD'"],
    ["numberLocale", "VARCHAR(16) NOT NULL DEFAULT 'en-US'"],
    ["isEnabled", "BOOLEAN NOT NULL DEFAULT true"],
    ["isDefault", "BOOLEAN NOT NULL DEFAULT false"],
    ["sortOrder", "INTEGER NOT NULL DEFAULT 0"],
    ["fallbackLocaleCode", "VARCHAR(16) NULL"],
    ["completionPercent", "INTEGER NOT NULL DEFAULT 0"],
    ["lastTranslationSyncAt", "DATETIME(3) NULL"],
  ];
  for (const [name, definition] of columns) {
    await ensureColumn(prisma, "LocaleConfig", name, definition, log);
  }
}

async function ensureCustom404Mysql(prisma, log = console.log) {
  if (!(await tableExists(prisma, "Custom404"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`Custom404\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`locale\` VARCHAR(191) NOT NULL,
        \`blocks\` JSON NOT NULL,
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`Custom404_locale_key\`(\`locale\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    log("[setup-schema] created Custom404");
    return;
  }
  await ensureColumn(prisma, "Custom404", "blocks", "JSON NOT NULL DEFAULT ('[]')", log);
  await ensureIndex(prisma, "Custom404", "Custom404_locale_key", "`locale`", true, log);
}

async function ensureJsonStoreMysql(prisma, log = console.log) {
  if (!(await tableExists(prisma, "JsonStore"))) return;
  await ensureColumn(prisma, "JsonStore", "version", "INTEGER NOT NULL DEFAULT 1", log);
  await ensureIndex(prisma, "JsonStore", "JsonStore_namespace_key_key", "`namespace`, `key`", true, log);
}

/** Empty string / NULL in JSON columns breaks Prisma with "Unexpected end of JSON input". */
async function repairInvalidJsonColumns(prisma, log = console.log) {
  const repairs = [
    ["SiteTheme", "brandConfig", "{}"],
    ["SiteTheme", "headerConfig", "{}"],
    ["SiteTheme", "footerConfig", "{}"],
    ["SiteTheme", "typography", "{}"],
    ["SiteTheme", "backgroundEffectSettings", "{}"],
    ["SiteTheme", "cursorEffectSettings", "{}"],
    ["SiteTheme", "textEffectSettings", "{}"],
    ["SiteTheme", "glassEffectSettings", "{}"],
    ["SiteTheme", "motionSettings", "{}"],
    ["SiteTheme", "themeProvenance", "{}"],
    ["SiteTheme", "mobileBrowserConfig", "{}"],
    ["CmsPage", "composition", "{}"],
    ["CmsPage", "visualSettings", "{}"],
    ["CmsPage", "blocks", "[]"],
    ["CompanyInfo", "socialLinks", "{}"],
    ["CompanyInfo", "trustBadges", "[]"],
    ["Custom404", "blocks", "[]"],
    ["PackageInstallation", "manifest", "{}"],
    ["JsonStore", "data", "{}"],
  ];
  for (const [table, column, fallback] of repairs) {
    if (!(await tableExists(prisma, table))) continue;
    if (!(await columnExists(prisma, table, column))) continue;
    try {
      // CAST AS CHAR can still fail for some drivers; also catch bare empty / whitespace.
      const result = await prisma.$executeRawUnsafe(
        `UPDATE \`${table}\`
         SET \`${column}\` = CAST(? AS JSON)
         WHERE \`${column}\` IS NULL
            OR TRIM(CAST(\`${column}\` AS CHAR)) = ''
            OR JSON_VALID(CAST(\`${column}\` AS CHAR)) = 0`,
        fallback,
      );
      if (Number(result) > 0) {
        log(`[setup-schema] repaired invalid JSON in ${table}.${column} (${result} row(s))`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[setup-schema] JSON repair skipped for ${table}.${column}: ${message.split("\n")[0]}`);
    }
  }
}

/** Public alias for setup complete — repair before any Prisma model read. */
export async function repairSetupJsonColumns(prisma, options = {}) {
  await repairInvalidJsonColumns(prisma, options.log ?? console.log);
}

async function ensureCompanyInfoMysql(prisma, log = console.log) {
  if (!(await tableExists(prisma, "CompanyInfo"))) return;
  const required = [
    ["registrationNo", "VARCHAR(191) NOT NULL DEFAULT ''"],
    ["licenseInfo", "TEXT NOT NULL"],
    ["phone", "VARCHAR(191) NOT NULL DEFAULT ''"],
    ["whatsapp", "VARCHAR(191) NOT NULL DEFAULT ''"],
    ["email", "VARCHAR(191) NOT NULL DEFAULT ''"],
    ["socialLinks", "JSON NOT NULL DEFAULT ('{}')"],
    ["trustBadges", "JSON NOT NULL DEFAULT ('[]')"],
  ];
  for (const [name, definition] of required) {
    await ensureColumn(prisma, "CompanyInfo", name, definition, log);
  }
  // licenseInfo without DEFAULT: if just added empty, fill rows
  if (await columnExists(prisma, "CompanyInfo", "licenseInfo")) {
    await prisma.$executeRawUnsafe(
      "UPDATE `CompanyInfo` SET `licenseInfo` = '' WHERE `licenseInfo` IS NULL",
    ).catch(() => undefined);
  }

  const legacy = [
    "taglineEn",
    "taglineAr",
    "storyEn",
    "storyAr",
    "missionEn",
    "missionAr",
    "visionEn",
    "visionAr",
    "valuesEn",
    "valuesAr",
    "addressEn",
    "addressAr",
    "officeHoursEn",
    "officeHoursAr",
  ];
  for (const column of legacy) {
    if (!(await columnExists(prisma, "CompanyInfo", column))) continue;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_TYPE AS columnType, IS_NULLABLE AS nullable
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND LOWER(TABLE_NAME) = 'companyinfo'
         AND LOWER(COLUMN_NAME) = LOWER(?)`,
      column,
    );
    const row = rows[0];
    if (!row || String(row.nullable).toUpperCase() === "YES") continue;
    const columnType = String(row.columnType || "TEXT");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`CompanyInfo\` MODIFY COLUMN \`${column}\` ${columnType} NULL`,
    );
    log(`[setup-schema] CompanyInfo.${column} is nullable; existing values kept`);
  }
}

async function ensureUserMysql(prisma, log = console.log) {
  if (!(await tableExists(prisma, "User"))) return;
  const columns = [
    ["sessionVersion", "INT NOT NULL DEFAULT 0"],
    ["disabledAt", "DATETIME(3) NULL"],
    ["lockedUntil", "DATETIME(3) NULL"],
    ["failedLoginCount", "INT NOT NULL DEFAULT 0"],
    ["emailVerifiedAt", "DATETIME(3) NULL"],
    ["pendingEmail", "VARCHAR(191) NULL"],
    ["phone", "VARCHAR(191) NULL"],
    ["dateOfBirth", "DATE NULL"],
    ["addressLine1", "VARCHAR(191) NULL"],
    ["addressLine2", "VARCHAR(191) NULL"],
    ["city", "VARCHAR(191) NULL"],
    ["state", "VARCHAR(191) NULL"],
    ["postalCode", "VARCHAR(191) NULL"],
    ["country", "VARCHAR(191) NULL"],
    ["marketingOptIn", "BOOLEAN NOT NULL DEFAULT false"],
    ["totpSecret", "TEXT NULL"],
    ["totpEnabled", "BOOLEAN NOT NULL DEFAULT false"],
    ["mustChangePassword", "BOOLEAN NOT NULL DEFAULT false"],
  ];
  for (const [name, definition] of columns) {
    await ensureColumn(prisma, "User", name, definition, log);
  }
  await prisma.$executeRawUnsafe(
    "UPDATE `User` SET `emailVerifiedAt` = `createdAt` WHERE `emailVerifiedAt` IS NULL",
  ).catch(() => undefined);

  const enumRows = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_TYPE AS columnType FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) = 'user'
       AND LOWER(COLUMN_NAME) = 'role'`,
  );
  const columnType = String(enumRows[0]?.columnType ?? "");
  if (columnType && !/SUPER_ADMIN/i.test(columnType)) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`User\`
        MODIFY COLUMN \`role\`
        ENUM('ADMIN', 'CUSTOMER', 'SUPER_ADMIN')
        NOT NULL DEFAULT 'CUSTOMER'`);
    log("[setup-schema] added SUPER_ADMIN to User.role");
  }
}

/**
 * Apply every additive patch setup complete needs on an existing MySQL database.
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ log?: (...args: unknown[]) => void }} [options]
 */
export async function ensureSetupCriticalMysql(prisma, options = {}) {
  const log = options.log ?? console.log;
  await ensureUserMysql(prisma, log);
  await ensureCompanyInfoMysql(prisma, log);
  await ensureEntityTranslationMysql(prisma, log);
  await ensureLocalizedSlugMysql(prisma, log);
  await ensureSiteThemeMysql(prisma, log);
  await ensureCmsPageMysql(prisma, log);
  await ensureLocaleConfigMysql(prisma, log);
  await ensureCustom404Mysql(prisma, log);
  await ensureJsonStoreMysql(prisma, log);
  await repairInvalidJsonColumns(prisma, log);
}
