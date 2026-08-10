/**
 * Generate destructive i18n migration SQL from current schema state.
 * Run: npx tsx scripts/i18n/generate-migration-sql.ts
 */
import * as fs from "fs";
import * as path from "path";

const outPath = path.join(
  process.cwd(),
  "prisma/migrations/20260615120000_translation_only_architecture/migration.sql"
);

const enArColumns: { table: string; columns: string[] }[] = [
  { table: "Gallery", columns: ["titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr"] },
  { table: "GalleryMedia", columns: ["titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr"] },
  { table: "Testimonial", columns: ["contentEn", "contentAr"] },
  { table: "TestimonialCollection", columns: ["titleEn", "titleAr", "excerptEn", "excerptAr"] },
  { table: "FaqSet", columns: ["titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr"] },
  { table: "FaqItem", columns: ["questionEn", "questionAr", "answerEn", "answerAr"] },
  { table: "CompanyInfo", columns: ["taglineEn", "taglineAr", "storyEn", "storyAr", "missionEn", "missionAr", "visionEn", "visionAr", "valuesEn", "valuesAr", "addressEn", "addressAr", "officeHoursEn", "officeHoursAr"] },
  { table: "SeoSettings", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] },
  { table: "MediaAsset", columns: ["altEn", "altAr"] },
  { table: "CmsPage", columns: ["titleEn", "titleAr", "excerptEn", "excerptAr"] },
  { table: "PostCategory", columns: ["nameEn", "nameAr"] },
  { table: "PostTag", columns: ["nameEn", "nameAr"] },
  { table: "PostAuthor", columns: ["bioEn", "bioAr"] },
  { table: "Post", columns: ["titleEn", "titleAr", "excerptEn", "excerptAr", "contentEn", "contentAr"] },
  { table: "SeoMeta", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr", "ogTitleEn", "ogTitleAr"] },
  { table: "Custom404", columns: ["titleEn", "titleAr", "bodyEn", "bodyAr"] },
  { table: "ContentType", columns: ["nameEn", "nameAr", "labelSingularEn", "labelSingularAr", "labelPluralEn", "labelPluralAr"] },
  { table: "ContentCollection", columns: ["nameEn", "nameAr", "excerptEn", "excerptAr"] },
  { table: "ContentItem", columns: ["titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr"] },
  { table: "ContentItemMedia", columns: ["altEn", "altAr", "captionEn", "captionAr"] },
  { table: "PricingPlanSet", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] },
  { table: "PricingPlan", columns: ["nameEn", "nameAr", "descriptionEn", "descriptionAr", "badgeEn", "badgeAr", "ctaLabelEn", "ctaLabelAr"] },
  { table: "PricingPlanFeature", columns: ["labelEn", "labelAr"] },
  { table: "ReleaseSet", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] },
  { table: "ReleaseEntry", columns: ["textEn", "textAr"] },
  { table: "PricingCalculator", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] },
  { table: "PricingCalculatorField", columns: ["labelEn", "labelAr"] },
  { table: "KnowledgeBase", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] },
  { table: "KnowledgeCategory", columns: ["titleEn", "titleAr"] },
  { table: "KnowledgeArticle", columns: ["titleEn", "titleAr", "excerptEn", "excerptAr", "bodyEn", "bodyAr"] },
  { table: "DocPortal", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] },
  { table: "DocVersion", columns: ["labelEn", "labelAr"] },
  { table: "DocSection", columns: ["titleEn", "titleAr", "contentEn", "contentAr"] },
  { table: "StatusBoard", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] },
  { table: "StatusService", columns: ["nameEn", "nameAr", "descriptionEn", "descriptionAr"] },
  { table: "StatusIncident", columns: ["titleEn", "titleAr", "messageEn", "messageAr"] },
  { table: "StatusMaintenance", columns: ["titleEn", "titleAr", "messageEn", "messageAr"] },
  { table: "TeamDirectory", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] },
  { table: "TeamDepartment", columns: ["nameEn", "nameAr"] },
  { table: "TeamMember", columns: ["nameEn", "nameAr", "roleEn", "roleAr", "bioEn", "bioAr", "locationEn", "locationAr"] },
  { table: "PartnerProgram", columns: ["titleEn", "titleAr", "descriptionEn", "descriptionAr"] },
  { table: "PartnerCategory", columns: ["nameEn", "nameAr"] },
  { table: "Partner", columns: ["nameEn", "nameAr", "descriptionEn", "descriptionAr", "locationEn", "locationAr"] },
];

const lines: string[] = [
  "-- Translation-only architecture migration",
  "-- Run backfill scripts BEFORE applying this migration in production",
  "",
  "-- Extend TranslationStatus enum",
  "ALTER TABLE `EntityTranslation` MODIFY `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED';",
  "ALTER TABLE `EntityTranslationVersion` MODIFY `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL;",
  "ALTER TABLE `UiMessage` MODIFY `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED';",
  "",
  "-- LocaleConfig additions",
  "ALTER TABLE `LocaleConfig` ADD COLUMN `fallbackLocaleCode` VARCHAR(16) NULL,",
  "  ADD COLUMN `completionPercent` INT NOT NULL DEFAULT 0,",
  "  ADD COLUMN `lastTranslationSyncAt` DATETIME(3) NULL;",
  "",
  "-- EntityTranslation: rename languageCode → localeCode, add version",
  "ALTER TABLE `EntityTranslation` CHANGE COLUMN `languageCode` `localeCode` VARCHAR(16) NOT NULL;",
  "ALTER TABLE `EntityTranslation` ADD COLUMN `version` INT NOT NULL DEFAULT 1;",
  "",
  "-- LocalizedSlug rename",
  "ALTER TABLE `LocalizedSlug` CHANGE COLUMN `languageCode` `localeCode` VARCHAR(16) NOT NULL;",
  "",
  "-- UiMessage rename",
  "ALTER TABLE `UiMessage` CHANGE COLUMN `languageCode` `localeCode` VARCHAR(16) NOT NULL;",
  "",
  "-- TranslationJob rename",
  "ALTER TABLE `TranslationJob` CHANGE COLUMN `languageCode` `localeCode` VARCHAR(16) NOT NULL;",
  "",
  "-- Drop En/Ar columns",
];

for (const { table, columns } of enArColumns) {
  for (const col of columns) {
    lines.push(`ALTER TABLE \`${table}\` DROP COLUMN \`${col}\`;`);
  }
}

lines.push("");
lines.push("-- CatalogCollection: drop name/description and locale overrides table");
lines.push("ALTER TABLE `CatalogCollection` DROP COLUMN `name`;");
lines.push("ALTER TABLE `CatalogCollection` DROP COLUMN `description`;");
lines.push("DROP TABLE IF EXISTS `CatalogCollectionLocale`;");

lines.push("");
lines.push("-- Product consolidation");
lines.push("ALTER TABLE `Product` ADD COLUMN `canonicalSlug` VARCHAR(255) NULL;");
lines.push("UPDATE `Product` SET `canonicalSlug` = `slug` WHERE `canonicalSlug` IS NULL;");
lines.push("ALTER TABLE `Product` MODIFY `canonicalSlug` VARCHAR(255) NOT NULL;");
lines.push("ALTER TABLE `Product` DROP INDEX `Product_locale_slug_key`;");
lines.push("ALTER TABLE `Product` DROP COLUMN `locale`;");
lines.push("ALTER TABLE `Product` DROP COLUMN `slug`;");
lines.push("ALTER TABLE `Product` DROP COLUMN `productTitle`;");
lines.push("CREATE UNIQUE INDEX `Product_canonicalSlug_key` ON `Product`(`canonicalSlug`);");
lines.push("CREATE UNIQUE INDEX `Product_sku_key` ON `Product`(`sku`);");
lines.push("DROP INDEX `Product_locale_idx` ON `Product`;");
lines.push("DROP INDEX `Product_locale_brand_idx` ON `Product`;");
lines.push("DROP INDEX `Product_locale_category_idx` ON `Product`;");
lines.push("DROP INDEX `Product_locale_status_idx` ON `Product`;");
lines.push("DROP INDEX `Product_locale_stockStatus_idx` ON `Product`;");
lines.push("DROP INDEX `Product_locale_priceValue_idx` ON `Product`;");
lines.push("CREATE INDEX `Product_canonicalSlug_idx` ON `Product`(`canonicalSlug`);");
lines.push("CREATE INDEX `Product_brand_idx` ON `Product`(`brand`);");
lines.push("CREATE INDEX `Product_category_idx` ON `Product`(`category`);");
lines.push("CREATE INDEX `Product_status_idx` ON `Product`(`status`);");
lines.push("CREATE INDEX `Product_stockStatus_idx` ON `Product`(`stockStatus`);");
lines.push("CREATE INDEX `Product_priceValue_idx` ON `Product`(`priceValue`);");

lines.push("");
lines.push("-- New tables");
lines.push(`CREATE TABLE \`UiMessageVersion\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`messageId\` VARCHAR(191) NOT NULL,
  \`value\` TEXT NOT NULL,
  \`status\` ENUM('DRAFT', 'REVIEW', 'PUBLISHED') NOT NULL,
  \`changedBy\` VARCHAR(36) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`UiMessageVersion_messageId_createdAt_idx\`(\`messageId\`, \`createdAt\`),
  CONSTRAINT \`UiMessageVersion_messageId_fkey\` FOREIGN KEY (\`messageId\`) REFERENCES \`UiMessage\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);

lines.push(`CREATE TABLE \`TranslationMemory\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`sourceLocale\` VARCHAR(16) NOT NULL,
  \`targetLocale\` VARCHAR(16) NOT NULL,
  \`sourceHash\` VARCHAR(64) NOT NULL,
  \`sourceText\` TEXT NOT NULL,
  \`targetText\` TEXT NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`TranslationMemory_sourceHash_targetLocale_key\`(\`sourceHash\`, \`targetLocale\`),
  INDEX \`TranslationMemory_sourceLocale_targetLocale_idx\`(\`sourceLocale\`, \`targetLocale\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"));
console.log(`Wrote ${outPath} (${lines.length} lines)`);
