/**
 * Codemod: remove legacy i18n patterns from source files.
 * Run: npx tsx scripts/i18n/codemod-remove-legacy.ts
 */
import * as fs from "fs";
import * as path from "path";

if (process.env.ALLOW_ARCHIVED_I18N_CODEMODS !== "1") {
  throw new Error("Archived script: codemod-remove-legacy.ts is disabled by default.");
}

const SRC = path.join(process.cwd(), "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const IMPORT_PATTERNS = [
  /import\s*\{[^}]*extractLegacyColumns[^}]*\}\s*from\s*["']@\/features\/translation\/form-sync["'];?\n/g,
  /import\s*\{[^}]*\}\s*from\s*["']@\/features\/translation\/legacy-adapter["'];?\n/g,
  /import\s*\{[^}]*\}\s*from\s*["']@\/features\/translation\/bilingual-form-fallback["'];?\n/g,
  /import\s*\{[^}]*\}\s*from\s*["']@\/features\/translation\/i18n-flags["'];?\n/g,
  /import\s*\{[^}]*\}\s*from\s*["']@\/features\/translation\/hybrid-sync["'];?\n/g,
  /,\s*extractLegacyColumns/g,
  /extractLegacyColumns,\s*/g,
  /,\s*applyLegacyWritePolicy/g,
  /applyLegacyWritePolicy,\s*/g,
  /,\s*applyBilingualLegacyFallbacks/g,
  /applyBilingualLegacyFallbacks,\s*/g,
];

const LINE_PATTERNS = [
  /^\s*const\s+legacy\w*\s*=\s*extractLegacyColumns\([^)]*\);?\s*$/gm,
  /^\s*const\s+\w+\s*=\s*applyLegacyWritePolicy\([^)]*\);?\s*$/gm,
  /^\s*\w+\s*=\s*applyBilingualLegacyFallbacks\([^)]*\);?\s*$/gm,
  /^\s*\/\/\s*Legacy.*\n/gm,
];

// Prisma data object keys to strip
const PRISMA_LEGACY_KEYS = [
  "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr",
  "contentEn", "contentAr", "nameEn", "nameAr", "questionEn", "questionAr",
  "answerEn", "answerAr", "bioEn", "bioAr", "bodyEn", "bodyAr",
  "taglineEn", "taglineAr", "storyEn", "storyAr", "missionEn", "missionAr",
  "visionEn", "visionAr", "valuesEn", "valuesAr", "addressEn", "addressAr",
  "officeHoursEn", "officeHoursAr", "altEn", "altAr", "captionEn", "captionAr",
  "infoEn", "infoAr", "labelSingularEn", "labelSingularAr", "labelPluralEn", "labelPluralAr",
  "ogTitleEn", "ogTitleAr", "metaTitleEn", "metaTitleAr", "badgeEn", "badgeAr",
  "ctaLabelEn", "ctaLabelAr", "labelEn", "labelAr", "textEn", "textAr",
  "messageEn", "messageAr", "roleEn", "roleAr", "locationEn", "locationAr",
  "productTitle",
];

function stripPrismaLegacyFields(content: string): string {
  let result = content;
  for (const key of PRISMA_LEGACY_KEYS) {
    // Remove lines like `titleEn: something,` or spread from legacy
    result = result.replace(new RegExp(`\\n\\s*${key}:\\s*[^,\\n]+,?`, "g"), "");
    result = result.replace(new RegExp(`\\n\\s*\\.\\.\\.legacy[^,\\n]*,?`, "g"), "");
    result = result.replace(new RegExp(`\\n\\s*\\.\\.\\.\\w*Legacy[^,\\n]*,?`, "g"), "");
  }
  return result;
}

function cleanFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  for (const pat of IMPORT_PATTERNS) {
    content = content.replace(pat, "");
  }
  for (const pat of LINE_PATTERNS) {
    content = content.replace(pat, "");
  }

  if (
    filePath.includes("actions.ts") ||
    filePath.includes("repository") ||
    filePath.includes("service.ts")
  ) {
    content = stripPrismaLegacyFields(content);
  }

  // Clean empty import lines
  content = content.replace(/import\s*\{\s*\}\s*from\s*[^;]+;\n/g, "");

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

let changed = 0;
for (const file of walk(SRC)) {
  if (cleanFile(file)) {
    changed++;
    console.log("Updated:", path.relative(process.cwd(), file));
  }
}
console.log(`\n${changed} files updated`);
