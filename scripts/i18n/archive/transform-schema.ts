/**
 * One-time schema transform: remove En/Ar columns, rename languageCode → localeCode.
 * Run: npx tsx scripts/i18n/transform-schema.ts
 */
import * as fs from "fs";
import * as path from "path";

if (process.env.ALLOW_ARCHIVED_I18N_CODEMODS !== "1") {
  throw new Error("Archived script: transform-schema.ts is disabled by default.");
}

const SCHEMA_PATHS = [
  path.join(process.cwd(), "prisma/schema.prisma"),
  path.join(process.cwd(), "prisma/schema.postgresql.prisma"),
];

function transformSchema(content: string): string {
  let lines = content.split("\n");

  // Remove En/Ar bilingual field lines (not comments, not enum values like RELEASED)
  lines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) return true;
    // Match field definitions like titleEn, titleAr, valuesEn, etc.
    if (/^\w+(En|Ar)\s+/.test(trimmed)) return false;
    return true;
  });

  let result = lines.join("\n");

  // TranslationStatus: add REVIEW
  result = result.replace(
    /enum TranslationStatus \{\s*\n\s*DRAFT\s*\n\s*PUBLISHED\s*\n\}/,
    "enum TranslationStatus {\n  DRAFT\n  REVIEW\n  PUBLISHED\n}"
  );

  // LocaleConfig additions
  result = result.replace(
    /(model LocaleConfig \{[\s\S]*?sortOrder\s+Int\s+@default\(0\))\s*\n(\s*createdAt)/,
    `$1
  fallbackLocaleCode String?  @db.VarChar(16)
  completionPercent  Int      @default(0)
  lastTranslationSyncAt DateTime?
$2`
  );

  // EntityTranslation: languageCode → localeCode, add version
  result = result.replace(/languageCode/g, "localeCode");
  result = result.replace(
    /(model EntityTranslation \{[\s\S]*?value\s+String\s+@db\.Text)\s*\n(\s*status)/,
    `$1
  version      Int                @default(1)
$2`
  );

  // Product consolidation
  result = result.replace(
    /model Product \{[\s\S]*?@@index\(\[locale, priceValue\]\)\s*\n\}/,
    `model Product {
  id              String   @id @default(cuid())
  canonicalSlug   String   @unique @db.VarChar(255)
  sku             String?  @unique @db.VarChar(64)

  priceValue      Decimal? @db.Decimal(12, 2)
  priceCurrency   String?  @db.VarChar(3)

  availability    String?  @db.VarChar(32)
  stockStatus     String?  @db.VarChar(32)

  brand           String?  @db.VarChar(128)
  category        String?  @db.VarChar(128)
  categories      Json?
  tags            Json?

  collectionSlugs Json?

  status          String   @default("published") @db.VarChar(32)
  sourceType      String?  @db.VarChar(16)
  sourceFile      String?  @db.VarChar(512)

  payload         Json

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([canonicalSlug])
  @@index([brand])
  @@index([category])
  @@index([status])
  @@index([stockStatus])
  @@index([priceValue])
}`
  );

  // CatalogCollection: remove localeOverrides relation and CatalogCollectionLocale model
  result = result.replace(/\s*localeOverrides CatalogCollectionLocale\[\]\s*\n/, "\n");
  result = result.replace(
    /model CatalogCollectionLocale \{[\s\S]*?@@index\(\[locale\]\)\s*\n\}\s*\n/,
    ""
  );

  // CatalogCollection: remove name/description (moved to EntityTranslation)
  result = result.replace(
    /(model CatalogCollection \{[\s\S]*?slug\s+String\s+@unique @db\.VarChar\(128\))\s*\n\s*name\s+String\s*\n\s*description String\?[^\n]*\n/,
    "$1\n"
  );

  // Add TranslationMemory and UiMessageVersion before FormSubmissionStatus enum area
  if (!result.includes("model TranslationMemory")) {
    result = result.replace(
      /(model UiMessage \{[\s\S]*?@@index\(\[localeCode, namespace\]\)\s*\n\})/,
      `$1

model UiMessageVersion {
  id        String            @id @default(cuid())
  messageId String
  message   UiMessage         @relation(fields: [messageId], references: [id], onDelete: Cascade)
  value     String            @db.Text
  status    TranslationStatus
  changedBy String?           @db.VarChar(36)
  createdAt DateTime          @default(now())

  @@index([messageId, createdAt])
}

model TranslationMemory {
  id           String @id @default(cuid())
  sourceLocale String @db.VarChar(16)
  targetLocale String @db.VarChar(16)
  sourceHash   String @db.VarChar(64)
  sourceText   String @db.Text
  targetText   String @db.Text
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([sourceHash, targetLocale])
  @@index([sourceLocale, targetLocale])
}`
    );
    // Add versions relation to UiMessage
    result = result.replace(
      /(model UiMessage \{[\s\S]*?updatedAt\s+DateTime\s+@updatedAt)\s*\n(\s*@@unique)/,
      `$1
  versions     UiMessageVersion[]
$2`
    );
  }

  return result;
}

for (const schemaPath of SCHEMA_PATHS) {
  if (!fs.existsSync(schemaPath)) continue;
  const original = fs.readFileSync(schemaPath, "utf8");
  const transformed = transformSchema(original);
  fs.writeFileSync(schemaPath, transformed);
  console.log(`Transformed: ${schemaPath}`);
}
