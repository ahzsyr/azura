/**
 * Campaign-intelligence tables (visitors, sessions, events, campaigns).
 * Hostinger skips failed prisma/migrations; PostgreSQL never runs migrate deploy.
 * Idempotent — safe to re-run on every start.
 */
const MYSQL_TABLE = "DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";

const CAMPAIGN_STATUS =
  "ENUM('DRAFT','SCHEDULED','ACTIVE','PAUSED','COMPLETED','ARCHIVED')";
const TOUCH_TYPE =
  "ENUM('FIRST_TOUCH','SESSION_START','PAID_CLICK','ORGANIC_SEARCH','REFERRAL','EMAIL','SOCIAL_ORGANIC','DIRECT','CAMPAIGN_URL','CONVERSION_TOUCH')";
const CLICK_ID_TYPE = "ENUM('GCLID','FBCLID','MSCLKID','LI_FAT_ID','OTHER')";
const CONSENT_STATUS = "ENUM('UNKNOWN','GRANTED','DENIED','WITHDRAWN')";

async function mysqlTableExists(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table,
  );
  return Number(rows[0]?.c ?? 0) > 0;
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

async function postgresTableExists(prisma, table) {
  const rows = await prisma.$queryRaw`
    SELECT 1 AS found
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ${table}
    LIMIT 1`;
  return Array.isArray(rows) && rows.length > 0;
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

async function createMysqlTable(prisma, name, columnsSql) {
  if (await mysqlTableExists(prisma, name)) {
    console.log(`[db-migrate] MySQL: ${name} already exists`);
    return;
  }
  await prisma.$executeRawUnsafe(`CREATE TABLE \`${name}\` (${columnsSql}) ${MYSQL_TABLE}`);
  console.log(`[db-migrate] MySQL: created ${name}`);
}

async function addMysqlColumn(prisma, table, column, definition) {
  if (!(await mysqlTableExists(prisma, table))) return;
  if (await mysqlColumnExists(prisma, table, column)) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
  );
  console.log(`[db-migrate] MySQL: added ${table}.${column}`);
}

async function addPostgresColumn(prisma, table, column, definition) {
  if (!(await postgresTableExists(prisma, table))) return;
  if (await postgresColumnExists(prisma, table, column)) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`,
  );
  console.log(`[db-migrate] PostgreSQL: added ${table}.${column}`);
}

const MYSQL_TABLES = [
  [
    "MarketingSource",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`key\` VARCHAR(64) NOT NULL,
      \`label\` VARCHAR(128) NOT NULL,
      \`category\` VARCHAR(32) NOT NULL DEFAULT 'other',
      \`sortOrder\` INT NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingSource_key_key\`(\`key\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingConversionDefinition",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`key\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(128) NOT NULL,
      \`description\` TEXT NULL,
      \`triggerType\` VARCHAR(64) NOT NULL,
      \`triggerConfig\` JSON NOT NULL DEFAULT ('{}'),
      \`value\` DOUBLE NULL,
      \`currency\` VARCHAR(8) NULL,
      \`enabled\` BOOLEAN NOT NULL DEFAULT true,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingConversionDefinition_key_key\`(\`key\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingCampaign",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`internalId\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(256) NOT NULL,
      \`objective\` VARCHAR(128) NULL,
      \`channel\` VARCHAR(64) NULL,
      \`status\` ${CAMPAIGN_STATUS} NOT NULL DEFAULT 'DRAFT',
      \`startDate\` DATETIME(3) NULL,
      \`endDate\` DATETIME(3) NULL,
      \`budget\` DOUBLE NULL,
      \`budgetCurrency\` VARCHAR(8) NULL,
      \`targetAudience\` TEXT NULL,
      \`targetLocation\` VARCHAR(256) NULL,
      \`landingPagePath\` VARCHAR(512) NULL,
      \`conversionGoalId\` VARCHAR(191) NULL,
      \`description\` TEXT NULL,
      \`notes\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingCampaign_internalId_key\`(\`internalId\`),
      INDEX \`MarketingCampaign_status_idx\`(\`status\`),
      INDEX \`MarketingCampaign_startDate_endDate_idx\`(\`startDate\`, \`endDate\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingCampaignProviderBinding",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`campaignId\` VARCHAR(191) NOT NULL,
      \`providerId\` VARCHAR(64) NOT NULL,
      \`adAccountId\` VARCHAR(191) NULL,
      \`externalCampaignId\` VARCHAR(128) NULL,
      \`externalCampaignName\` VARCHAR(256) NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'linked',
      \`syncStatus\` VARCHAR(32) NOT NULL DEFAULT 'idle',
      \`lastSyncAt\` DATETIME(3) NULL,
      \`lastMetricsSyncAt\` DATETIME(3) NULL,
      \`lastSyncError\` TEXT NULL,
      \`providerMetadata\` JSON NOT NULL DEFAULT ('{}'),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MktCampaignProvBind_uniq\`(\`campaignId\`, \`providerId\`, \`externalCampaignId\`),
      INDEX \`MarketingCampaignProviderBinding_providerId_idx\`(\`providerId\`),
      INDEX \`MarketingCampaignProviderBinding_adAccountId_idx\`(\`adAccountId\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingExternalCampaign",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`providerId\` VARCHAR(64) NOT NULL,
      \`externalId\` VARCHAR(128) NOT NULL,
      \`providerEntityType\` VARCHAR(64) NOT NULL DEFAULT 'campaign',
      \`name\` VARCHAR(256) NOT NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'unknown',
      \`adAccountId\` VARCHAR(191) NULL,
      \`providerBindingId\` VARCHAR(191) NULL,
      \`providerMetadata\` JSON NOT NULL DEFAULT ('{}'),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingExternalCampaign_providerId_externalId_key\`(\`providerId\`, \`externalId\`),
      INDEX \`MarketingExternalCampaign_adAccountId_idx\`(\`adAccountId\`),
      INDEX \`MarketingExternalCampaign_providerBindingId_idx\`(\`providerBindingId\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingAdGroup",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`providerId\` VARCHAR(64) NOT NULL,
      \`externalId\` VARCHAR(128) NOT NULL,
      \`providerEntityType\` VARCHAR(64) NOT NULL DEFAULT 'ad_group',
      \`name\` VARCHAR(256) NOT NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'unknown',
      \`externalCampaignId\` VARCHAR(191) NOT NULL,
      \`providerMetadata\` JSON NOT NULL DEFAULT ('{}'),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingAdGroup_providerId_externalId_key\`(\`providerId\`, \`externalId\`),
      INDEX \`MarketingAdGroup_externalCampaignId_idx\`(\`externalCampaignId\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingAd",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`providerId\` VARCHAR(64) NOT NULL,
      \`externalId\` VARCHAR(128) NOT NULL,
      \`providerEntityType\` VARCHAR(64) NOT NULL DEFAULT 'ad',
      \`name\` VARCHAR(256) NOT NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'unknown',
      \`adGroupId\` VARCHAR(191) NOT NULL,
      \`providerMetadata\` JSON NOT NULL DEFAULT ('{}'),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingAd_providerId_externalId_key\`(\`providerId\`, \`externalId\`),
      INDEX \`MarketingAd_adGroupId_idx\`(\`adGroupId\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingCreative",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`providerId\` VARCHAR(64) NOT NULL,
      \`externalId\` VARCHAR(128) NOT NULL,
      \`providerEntityType\` VARCHAR(64) NOT NULL DEFAULT 'creative',
      \`name\` VARCHAR(256) NULL,
      \`creativeType\` VARCHAR(64) NULL,
      \`headline\` VARCHAR(512) NULL,
      \`body\` TEXT NULL,
      \`previewUrl\` TEXT NULL,
      \`adId\` VARCHAR(191) NOT NULL,
      \`providerMetadata\` JSON NOT NULL DEFAULT ('{}'),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingCreative_providerId_externalId_key\`(\`providerId\`, \`externalId\`),
      INDEX \`MarketingCreative_adId_idx\`(\`adId\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingTrackingUrl",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`campaignId\` VARCHAR(191) NOT NULL,
      \`providerBindingId\` VARCHAR(191) NULL,
      \`externalAdId\` VARCHAR(191) NULL,
      \`baseUrl\` TEXT NOT NULL,
      \`utmSource\` VARCHAR(128) NULL,
      \`utmMedium\` VARCHAR(128) NULL,
      \`utmCampaign\` VARCHAR(256) NULL,
      \`utmContent\` VARCHAR(256) NULL,
      \`utmTerm\` VARCHAR(256) NULL,
      \`fullUrl\` TEXT NOT NULL,
      \`qrAssetRef\` TEXT NULL,
      \`label\` VARCHAR(256) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      INDEX \`MarketingTrackingUrl_campaignId_idx\`(\`campaignId\`),
      INDEX \`MarketingTrackingUrl_utmCampaign_idx\`(\`utmCampaign\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingVisitor",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`visitorToken\` VARCHAR(64) NOT NULL,
      \`consentStatus\` ${CONSENT_STATUS} NOT NULL DEFAULT 'UNKNOWN',
      \`consentGrantedAt\` DATETIME(3) NULL,
      \`firstSeenAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`lastSeenAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingVisitor_visitorToken_key\`(\`visitorToken\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingSession",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`visitorId\` VARCHAR(191) NOT NULL,
      \`sessionToken\` VARCHAR(64) NOT NULL,
      \`entryUrl\` TEXT NULL,
      \`landingPagePath\` VARCHAR(512) NULL,
      \`referrer\` TEXT NULL,
      \`deviceType\` VARCHAR(32) NULL,
      \`browser\` VARCHAR(64) NULL,
      \`os\` VARCHAR(64) NULL,
      \`country\` VARCHAR(64) NULL,
      \`region\` VARCHAR(64) NULL,
      \`startedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`endedAt\` DATETIME(3) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingSession_sessionToken_key\`(\`sessionToken\`),
      INDEX \`MarketingSession_visitorId_startedAt_idx\`(\`visitorId\`, \`startedAt\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingTouch",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`visitorId\` VARCHAR(191) NOT NULL,
      \`sessionId\` VARCHAR(191) NOT NULL,
      \`sourceId\` VARCHAR(191) NULL,
      \`medium\` VARCHAR(64) NULL,
      \`internalCampaignId\` VARCHAR(191) NULL,
      \`providerBindingId\` VARCHAR(191) NULL,
      \`externalAdId\` VARCHAR(191) NULL,
      \`landingPagePath\` VARCHAR(512) NULL,
      \`referrer\` TEXT NULL,
      \`utmSource\` VARCHAR(128) NULL,
      \`utmMedium\` VARCHAR(128) NULL,
      \`utmCampaign\` VARCHAR(256) NULL,
      \`utmContent\` VARCHAR(256) NULL,
      \`utmTerm\` VARCHAR(256) NULL,
      \`touchType\` ${TOUCH_TYPE} NOT NULL DEFAULT 'DIRECT',
      \`clickIdType\` ${CLICK_ID_TYPE} NULL,
      \`clickId\` VARCHAR(256) NULL,
      \`occurredAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`providerMetadata\` JSON NOT NULL DEFAULT ('{}'),
      \`rawPayload\` JSON NOT NULL DEFAULT ('{}'),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`MarketingTouch_visitorId_occurredAt_idx\`(\`visitorId\`, \`occurredAt\`),
      INDEX \`MarketingTouch_sessionId_occurredAt_idx\`(\`sessionId\`, \`occurredAt\`),
      INDEX \`MarketingTouch_sourceId_idx\`(\`sourceId\`),
      INDEX \`MarketingTouch_internalCampaignId_idx\`(\`internalCampaignId\`),
      INDEX \`MarketingTouch_providerBindingId_idx\`(\`providerBindingId\`),
      INDEX \`MarketingTouch_touchType_idx\`(\`touchType\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingEvent",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`eventId\` VARCHAR(128) NULL,
      \`idempotencyKey\` VARCHAR(191) NOT NULL,
      \`visitorId\` VARCHAR(191) NULL,
      \`sessionId\` VARCHAR(191) NULL,
      \`touchId\` VARCHAR(191) NULL,
      \`name\` VARCHAR(128) NOT NULL,
      \`properties\` JSON NOT NULL DEFAULT ('{}'),
      \`internalCampaignId\` VARCHAR(191) NULL,
      \`landingPagePath\` VARCHAR(512) NULL,
      \`sourceId\` VARCHAR(191) NULL,
      \`medium\` VARCHAR(64) NULL,
      \`clientOccurredAt\` DATETIME(3) NOT NULL,
      \`serverReceivedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`MarketingEvent_idempotencyKey_key\`(\`idempotencyKey\`),
      INDEX \`MarketingEvent_name_clientOccurredAt_idx\`(\`name\`, \`clientOccurredAt\`),
      INDEX \`MarketingEvent_visitorId_clientOccurredAt_idx\`(\`visitorId\`, \`clientOccurredAt\`),
      INDEX \`MarketingEvent_internalCampaignId_idx\`(\`internalCampaignId\`),
      INDEX \`MarketingEvent_sourceId_idx\`(\`sourceId\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingConversion",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`idempotencyKey\` VARCHAR(191) NOT NULL,
      \`visitorId\` VARCHAR(191) NULL,
      \`sessionId\` VARCHAR(191) NULL,
      \`touchId\` VARCHAR(191) NULL,
      \`internalCampaignId\` VARCHAR(191) NULL,
      \`externalAdId\` VARCHAR(191) NULL,
      \`landingPagePath\` VARCHAR(512) NULL,
      \`sourceId\` VARCHAR(191) NULL,
      \`leadId\` VARCHAR(64) NULL,
      \`submissionId\` VARCHAR(64) NULL,
      \`conversionDefinitionId\` VARCHAR(191) NOT NULL,
      \`clientOccurredAt\` DATETIME(3) NOT NULL,
      \`serverReceivedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`metadata\` JSON NOT NULL DEFAULT ('{}'),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`MarketingConversion_idempotencyKey_key\`(\`idempotencyKey\`),
      INDEX \`MarketingConversion_conversionDefinitionId_clientOccurredAt_idx\`(\`conversionDefinitionId\`, \`clientOccurredAt\`),
      INDEX \`MarketingConversion_internalCampaignId_idx\`(\`internalCampaignId\`),
      INDEX \`MarketingConversion_sourceId_idx\`(\`sourceId\`),
      INDEX \`MarketingConversion_leadId_idx\`(\`leadId\`),
      INDEX \`MarketingConversion_submissionId_idx\`(\`submissionId\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingLeadAttribution",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`submissionId\` VARCHAR(64) NULL,
      \`inquiryId\` VARCHAR(64) NULL,
      \`leadEventId\` VARCHAR(191) NULL,
      \`visitorId\` VARCHAR(64) NULL,
      \`sessionId\` VARCHAR(64) NULL,
      \`firstTouchId\` VARCHAR(191) NULL,
      \`lastTouchId\` VARCHAR(191) NULL,
      \`sourceId\` VARCHAR(191) NULL,
      \`internalCampaignId\` VARCHAR(191) NULL,
      \`providerBindingId\` VARCHAR(191) NULL,
      \`externalAdId\` VARCHAR(64) NULL,
      \`landingPagePath\` VARCHAR(512) NULL,
      \`utmSource\` VARCHAR(128) NULL,
      \`utmMedium\` VARCHAR(128) NULL,
      \`utmCampaign\` VARCHAR(256) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      INDEX \`MarketingLeadAttribution_submissionId_idx\`(\`submissionId\`),
      INDEX \`MarketingLeadAttribution_inquiryId_idx\`(\`inquiryId\`),
      INDEX \`MarketingLeadAttribution_internalCampaignId_idx\`(\`internalCampaignId\`),
      INDEX \`MarketingLeadAttribution_providerBindingId_idx\`(\`providerBindingId\`),
      INDEX \`MarketingLeadAttribution_sourceId_idx\`(\`sourceId\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingMetricRollup",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`periodStart\` DATETIME(3) NOT NULL,
      \`periodEnd\` DATETIME(3) NOT NULL,
      \`granularity\` VARCHAR(16) NOT NULL DEFAULT 'day',
      \`internalCampaignId\` VARCHAR(191) NULL,
      \`providerBindingId\` VARCHAR(191) NULL,
      \`sourceId\` VARCHAR(64) NULL,
      \`providerId\` VARCHAR(64) NULL,
      \`landingPagePath\` VARCHAR(512) NULL,
      \`conversionType\` VARCHAR(64) NULL,
      \`trafficType\` VARCHAR(32) NULL,
      \`visitors\` INT NOT NULL DEFAULT 0,
      \`sessions\` INT NOT NULL DEFAULT 0,
      \`pageViews\` INT NOT NULL DEFAULT 0,
      \`leads\` INT NOT NULL DEFAULT 0,
      \`conversions\` INT NOT NULL DEFAULT 0,
      \`spend\` DOUBLE NOT NULL DEFAULT 0,
      \`impressions\` DOUBLE NOT NULL DEFAULT 0,
      \`clicks\` DOUBLE NOT NULL DEFAULT 0,
      \`metadata\` JSON NOT NULL DEFAULT ('{}'),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`MarketingMetricRollup_period_dims_key\`(\`periodStart\`, \`periodEnd\`, \`granularity\`, \`internalCampaignId\`, \`sourceId\`, \`providerId\`, \`providerBindingId\`, \`landingPagePath\`, \`conversionType\`, \`trafficType\`),
      INDEX \`MarketingMetricRollup_periodStart_granularity_idx\`(\`periodStart\`, \`granularity\`),
      INDEX \`MarketingMetricRollup_internalCampaignId_periodStart_idx\`(\`internalCampaignId\`, \`periodStart\`),
      INDEX \`MarketingMetricRollup_providerBindingId_periodStart_idx\`(\`providerBindingId\`, \`periodStart\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingAutomationRule",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`name\` VARCHAR(256) NOT NULL,
      \`enabled\` BOOLEAN NOT NULL DEFAULT true,
      \`triggerType\` VARCHAR(64) NOT NULL,
      \`conditions\` JSON NOT NULL DEFAULT ('{}'),
      \`actions\` JSON NOT NULL DEFAULT ('[]'),
      \`lastRunAt\` DATETIME(3) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      INDEX \`MarketingAutomationRule_enabled_triggerType_idx\`(\`enabled\`, \`triggerType\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingAutomationExecution",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`ruleId\` VARCHAR(191) NOT NULL,
      \`status\` VARCHAR(32) NOT NULL,
      \`payload\` JSON NOT NULL DEFAULT ('{}'),
      \`result\` JSON NOT NULL DEFAULT ('{}'),
      \`error\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`MarketingAutomationExecution_ruleId_createdAt_idx\`(\`ruleId\`, \`createdAt\`),
      PRIMARY KEY (\`id\`)
    `,
  ],
  [
    "MarketingRetentionPolicy",
    `
      \`id\` VARCHAR(191) NOT NULL,
      \`visitorDays\` INT NOT NULL DEFAULT 365,
      \`sessionDays\` INT NOT NULL DEFAULT 180,
      \`touchDays\` INT NOT NULL DEFAULT 365,
      \`eventDays\` INT NOT NULL DEFAULT 365,
      \`leadDays\` INT NOT NULL DEFAULT 730,
      \`providerPayloadDays\` INT NOT NULL DEFAULT 90,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    `,
  ],
];

const MYSQL_FKS = [
  [
    "MarketingCampaign",
    "MarketingCampaign_conversionGoalId_fkey",
    "FOREIGN KEY (`conversionGoalId`) REFERENCES `MarketingConversionDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
  ],
  [
    "MarketingCampaignProviderBinding",
    "MarketingCampaignProviderBinding_campaignId_fkey",
    "FOREIGN KEY (`campaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
  ],
  [
    "MarketingSession",
    "MarketingSession_visitorId_fkey",
    "FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
  ],
  [
    "MarketingTouch",
    "MarketingTouch_visitorId_fkey",
    "FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
  ],
  [
    "MarketingTouch",
    "MarketingTouch_sessionId_fkey",
    "FOREIGN KEY (`sessionId`) REFERENCES `MarketingSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
  ],
  [
    "MarketingEvent",
    "MarketingEvent_visitorId_fkey",
    "FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
  ],
  [
    "MarketingEvent",
    "MarketingEvent_sessionId_fkey",
    "FOREIGN KEY (`sessionId`) REFERENCES `MarketingSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
  ],
];

export async function ensureMarketingCampaignIntelligenceMysql(prisma) {
  for (const [name, sql] of MYSQL_TABLES) {
    await createMysqlTable(prisma, name, sql);
  }

  await addMysqlColumn(prisma, "Inquiry", "marketingCampaignId", "VARCHAR(64) NULL");
  await addMysqlColumn(prisma, "Inquiry", "attributionTouchId", "VARCHAR(64) NULL");
  await addMysqlColumn(prisma, "Inquiry", "attributionSourceId", "VARCHAR(64) NULL");
  await addMysqlColumn(prisma, "MarketingCampaignProviderBinding", "lastMetricsSyncAt", "DATETIME(3) NULL");
  await addMysqlColumn(prisma, "MarketingCampaignProviderBinding", "lastSyncError", "TEXT NULL");
  await addMysqlColumn(prisma, "MarketingTouch", "providerBindingId", "VARCHAR(191) NULL");
  await addMysqlColumn(prisma, "MarketingLeadAttribution", "providerBindingId", "VARCHAR(191) NULL");
  await addMysqlColumn(prisma, "MarketingMetricRollup", "providerBindingId", "VARCHAR(191) NULL");

  for (const [table, constraint, definition] of MYSQL_FKS) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraint}\` ${definition}`,
      );
    } catch {
      /* already present or engine skipped */
    }
  }

  await seedMysqlCampaignIntelligence(prisma);

  console.log("[db-migrate] MySQL: campaign intelligence tables ensured");
}

async function seedMysqlCampaignIntelligence(prisma) {
  try {
    await prisma.$executeRawUnsafe(`
      INSERT IGNORE INTO \`MarketingSource\`
        (\`id\`, \`key\`, \`label\`, \`category\`, \`sortOrder\`, \`createdAt\`, \`updatedAt\`)
      VALUES
        ('msrc_meta_ads', 'meta_ads', 'Meta Ads', 'paid', 10, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_google_ads', 'google_ads', 'Google Ads', 'paid', 20, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_linkedin_ads', 'linkedin_ads', 'LinkedIn Ads', 'paid', 30, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_instagram_ads', 'instagram_ads', 'Instagram Ads', 'paid', 40, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_organic_search', 'organic_search', 'Organic Search', 'organic', 50, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_direct', 'direct', 'Direct', 'direct', 60, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_referral', 'referral', 'Referral', 'referral', 70, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_email', 'email', 'Email', 'email', 80, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_social_organic', 'social_organic', 'Organic Social', 'social', 90, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_qr', 'qr', 'QR Code', 'offline', 100, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_campaign_url', 'campaign_url', 'Campaign URL', 'campaign', 110, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('msrc_other', 'other', 'Other', 'other', 120, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    `);
  } catch (error) {
    console.warn(
      "[db-migrate] MySQL: MarketingSource seed skipped:",
      error instanceof Error ? error.message.split("\n")[0] : error,
    );
  }

  // MariaDB rejects CAST(... AS JSON); a JSON column accepts a JSON text literal.
  try {
    await prisma.$executeRawUnsafe(`
      INSERT IGNORE INTO \`MarketingConversionDefinition\`
        (\`id\`, \`key\`, \`name\`, \`description\`, \`triggerType\`, \`triggerConfig\`, \`enabled\`, \`createdAt\`, \`updatedAt\`)
      VALUES
        ('mcd_form_submit', 'form_submit', 'Form Submission', 'Any form submission', 'form_submit', '{}', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('mcd_contact_request', 'contact_request', 'Contact Request', 'Contact / inquiry form', 'inquiry', '{}', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('mcd_rfq', 'rfq', 'RFQ / Quote Request', 'Quote request form', 'form_submit', '{}', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
        ('mcd_newsletter', 'newsletter', 'Newsletter Signup', 'Newsletter subscription', 'newsletter', '{}', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    `);
  } catch (error) {
    console.warn(
      "[db-migrate] MySQL: MarketingConversionDefinition seed skipped:",
      error instanceof Error ? error.message.split("\n")[0] : error,
    );
  }

  if (!(await mysqlTableExists(prisma, "MarketingRetentionPolicy"))) return;
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS c FROM \`MarketingRetentionPolicy\``,
    );
    if (Number(rows[0]?.c ?? 0) === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO \`MarketingRetentionPolicy\`
          (\`id\`, \`visitorDays\`, \`sessionDays\`, \`touchDays\`, \`eventDays\`, \`leadDays\`, \`providerPayloadDays\`, \`createdAt\`, \`updatedAt\`)
        VALUES ('mrp_default', 365, 180, 365, 365, 730, 90, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      `);
    }
  } catch (error) {
    console.warn(
      "[db-migrate] MySQL: MarketingRetentionPolicy seed skipped:",
      error instanceof Error ? error.message.split("\n")[0] : error,
    );
  }
}

export async function ensureMarketingCampaignIntelligencePostgres(prisma) {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "MarketingTouchType" AS ENUM ('FIRST_TOUCH', 'SESSION_START', 'PAID_CLICK', 'ORGANIC_SEARCH', 'REFERRAL', 'EMAIL', 'SOCIAL_ORGANIC', 'DIRECT', 'CAMPAIGN_URL', 'CONVERSION_TOUCH');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "MarketingClickIdType" AS ENUM ('GCLID', 'FBCLID', 'MSCLKID', 'LI_FAT_ID', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "MarketingConsentStatus" AS ENUM ('UNKNOWN', 'GRANTED', 'DENIED', 'WITHDRAWN');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  if (!(await postgresTableExists(prisma, "MarketingVisitor"))) {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const sqlPath = join(
      here,
      "../../prisma/migrations/20260824140000_marketing_campaign_intelligence/migration.sql",
    );
    const sql = readFileSync(sqlPath, "utf8");
    const statements = splitPostgresStatements(sql);
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          /already exists/i.test(message) ||
          /duplicate/i.test(message)
        ) {
          continue;
        }
        throw error;
      }
    }
    console.log("[db-migrate] PostgreSQL: applied campaign intelligence migration SQL");
  } else {
    console.log("[db-migrate] PostgreSQL: MarketingVisitor already exists");
  }

  await addPostgresColumn(prisma, "Inquiry", "marketingCampaignId", "VARCHAR(64)");
  await addPostgresColumn(prisma, "Inquiry", "attributionTouchId", "VARCHAR(64)");
  await addPostgresColumn(prisma, "Inquiry", "attributionSourceId", "VARCHAR(64)");
  await addPostgresColumn(prisma, "MarketingCampaignProviderBinding", "lastMetricsSyncAt", "TIMESTAMP(3)");
  await addPostgresColumn(prisma, "MarketingCampaignProviderBinding", "lastSyncError", "TEXT");
  await addPostgresColumn(prisma, "MarketingTouch", "providerBindingId", "TEXT");
  await addPostgresColumn(prisma, "MarketingLeadAttribution", "providerBindingId", "TEXT");
  await addPostgresColumn(prisma, "MarketingMetricRollup", "providerBindingId", "TEXT");
}

/** Split SQL on semicolons while keeping DO $$ ... $$ blocks intact. */
function splitPostgresStatements(sql) {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = [];
  let current = "";
  let inDollar = false;
  for (let i = 0; i < withoutComments.length; i++) {
    const slice = withoutComments.slice(i, i + 2);
    if (slice === "$$") {
      inDollar = !inDollar;
      current += slice;
      i += 1;
      continue;
    }
    const ch = withoutComments[i];
    if (ch === ";" && !inDollar) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }
    current += ch;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}
