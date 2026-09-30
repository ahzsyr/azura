/**
 * Export legacy UiMessage DB rows (if table still exists) into messages/{locale}.json,
 * merge catalog UI seeds, then write files.
 * Run: npm run i18n:export-ui-messages
 *      npm run i18n:export-ui-messages -- --write
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { detectLocaleColumn, tableHasColumn } from "./migration-utils";

const prisma = new PrismaClient();
const MESSAGES_DIR = path.join(process.cwd(), "messages");
const write = process.argv.includes("--write");

type NestedDict = Record<string, unknown>;

type LegacyUiMessageRow = {
  namespace: string;
  key: string;
  localeCode: string;
  value: string;
};

function isPostgresUrl(url: string | undefined): boolean {
  return !!url && /^postgres(ql)?:\/\//i.test(url);
}

function setNestedKey(obj: NestedDict, dotPath: string, value: string) {
  const parts = dotPath.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as NestedDict;
  }
  current[parts[parts.length - 1]] = value;
}

function deepMerge(base: NestedDict, override: NestedDict): NestedDict {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object"
    ) {
      result[key] = deepMerge(result[key] as NestedDict, value as NestedDict);
    } else if (value !== undefined && value !== "") {
      result[key] = value;
    }
  }
  return result;
}

function loadJson(filePath: string): NestedDict {
  if (!existsSync(filePath)) return {};
  return JSON.parse(readFileSync(filePath, "utf-8")) as NestedDict;
}

function mergeCatalogSeed(target: NestedDict) {
  const catalogPath = path.join(process.cwd(), "seeds", "catalog", "en-us", "ui", "global.json");
  if (!existsSync(catalogPath)) return;
  const catalog = loadJson(catalogPath);
  for (const section of ["product", "collection", "nav"] as const) {
    const seedSection = catalog[section];
    if (seedSection && typeof seedSection === "object") {
      const existing = (target[section] ?? {}) as NestedDict;
      target[section] = deepMerge(existing, seedSection as NestedDict);
    }
  }
}

/** Read legacy UiMessage rows via raw SQL (model removed from Prisma schema). */
async function loadLegacyUiMessages(): Promise<LegacyUiMessageRow[]> {
  try {
    const hasTable = await tableHasColumn(prisma, "UiMessage", "namespace");
    if (!hasTable) return [];

    const localeCol = await detectLocaleColumn(prisma, "UiMessage");
    const postgres = isPostgresUrl(process.env.DATABASE_URL);

    if (postgres) {
      return prisma.$queryRawUnsafe<LegacyUiMessageRow[]>(
        `SELECT "namespace", "key", "${localeCol}" AS "localeCode", "value"
         FROM "UiMessage"
         ORDER BY "${localeCol}" ASC, "namespace" ASC, "key" ASC`
      );
    }

    return prisma.$queryRawUnsafe<LegacyUiMessageRow[]>(
      `SELECT \`namespace\`, \`key\`, \`${localeCol}\` AS localeCode, \`value\`
       FROM \`UiMessage\`
       ORDER BY \`${localeCol}\` ASC, \`namespace\` ASC, \`key\` ASC`
    );
  } catch {
    return [];
  }
}

async function main() {
  const rows = await loadLegacyUiMessages();

  const byLocale = new Map<string, NestedDict>();

  for (const row of rows) {
    if (!row.value.trim()) continue;
    const locale = row.localeCode.toLowerCase();
    const dict = byLocale.get(locale) ?? loadJson(path.join(MESSAGES_DIR, `${locale}.json`));
    const fullKey = row.namespace === "root" ? row.key : `${row.namespace}.${row.key}`;
    setNestedKey(dict, fullKey, row.value);
    byLocale.set(locale, dict);
  }

  const enPath = path.join(MESSAGES_DIR, "en.json");
  const enDict = byLocale.get("en") ?? loadJson(enPath);
  mergeCatalogSeed(enDict);
  byLocale.set("en", enDict);

  if (byLocale.size === 0) {
    byLocale.set("en", enDict);
  }

  console.log(`Found ${rows.length} legacy UiMessage row(s) across ${byLocale.size} locale file(s).`);

  for (const [locale, dict] of byLocale) {
    const outPath = path.join(MESSAGES_DIR, `${locale}.json`);
    const existing = loadJson(outPath);
    const merged = deepMerge(existing, dict);
    console.log(`  ${locale}: ${outPath}`);
    if (write) {
      writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");
    }
  }

  if (!write) {
    console.log("\nDry run — pass --write to update message files.");
  } else {
    console.log("\nMessage files updated.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
