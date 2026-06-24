#!/usr/bin/env tsx
/**
 * Generate database import bundles from the Prisma schema + seed data.
 *
 * Usage:
 *   npm run db:export              # schema only
 *   npm run db:export -- --seed blank
 *   npm run db:export -- --seed demo-brt
 *   npm run db:export -- --seed demo-safar
 *   npm run db:export -- --seed all
 *   npm run db:export -- --no-seed   # export current DB state without reseeding
 *   npm run db:export -- --pg-from-mysql --seed all  # regenerate PostgreSQL seeds from MySQL SQL only
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getSeedAdminEmail, getSeedAdminPassword } from "../../src/config/site";
import { seedBrtWebsite } from "../../prisma/seed-brt-website";
import { seedSafarWebsite } from "../../prisma/seed-safar-website";

const ROOT = process.cwd();
const DB_DIR = join(ROOT, "database");
const MYSQL_DIR = join(DB_DIR, "mysql");
const PG_DIR = join(DB_DIR, "postgres");
const CSV_DIR = join(DB_DIR, "csv");

type SeedMode = "blank" | "demo-brt" | "demo-safar";

const prisma = new PrismaClient();

const MYSQL_SCHEMA_DIR = join(ROOT, "prisma/schema/mysql");
const PG_SCHEMA_DIR = join(ROOT, "prisma/schema/postgresql");

function readMultiFileSchema(schemaDir: string): string {
  return readdirSync(schemaDir)
    .filter((file) => file.endsWith(".prisma"))
    .sort()
    .map((file) => readFileSync(join(schemaDir, file), "utf-8"))
    .join("\n\n");
}

const MYSQL_SCHEMA_DATAMODEL = readMultiFileSchema(MYSQL_SCHEMA_DIR);

/** Prisma model names (= MySQL table names on Linux / Hostinger). */
const PRISMA_TABLES = MYSQL_SCHEMA_DATAMODEL.match(/^model (\w+)/gm)
  ?.map((line) => line.replace("model ", "")) ?? [];

const SKIP_SEED_TABLES = new Set(["_prisma_migrations"]);

type ColumnKind = "boolean" | "json" | "date" | "default";

type ColumnMeta = {
  kind: ColumnKind;
  nullable: boolean;
  jsonDefault: string;
};

const DEFAULT_COLUMN_META: ColumnMeta = {
  kind: "default",
  nullable: true,
  jsonDefault: "{}",
};

function parseColumnTypes(): Map<string, Map<string, ColumnMeta>> {
  const schema = MYSQL_SCHEMA_DATAMODEL;
  const map = new Map<string, Map<string, ColumnMeta>>();
  let currentModel: string | null = null;

  for (const line of schema.split("\n")) {
    const modelMatch = line.match(/^model (\w+)/);
    if (modelMatch) {
      currentModel = modelMatch[1];
      map.set(currentModel, new Map());
      continue;
    }
    if (!currentModel) continue;
    if (line.match(/^\}/)) {
      currentModel = null;
      continue;
    }
    const colMatch = line.match(/^\s+(\w+)\s+(\w+\??)/);
    if (!colMatch) continue;
    const [, col, typeToken] = colMatch;
    const nullable = typeToken.endsWith("?");
    const baseType = typeToken.replace("?", "");
    const defaultMatch = line.match(/@default\("((?:\\.|[^"\\])*)"\)/);
    const jsonDefault = defaultMatch?.[1]?.replace(/\\"/g, '"') ?? "{}";

    if (baseType === "Json") {
      map.get(currentModel)!.set(col, { kind: "json", nullable, jsonDefault });
    } else if (baseType === "Boolean") {
      map.get(currentModel)!.set(col, { kind: "boolean", nullable, jsonDefault });
    } else if (line.includes("@db.Date")) {
      map.get(currentModel)!.set(col, { kind: "date", nullable, jsonDefault });
    }
  }

  return map;
}

const COLUMN_TYPES = parseColumnTypes();

function getColumnMeta(table: string, column: string): ColumnMeta {
  return COLUMN_TYPES.get(table)?.get(column) ?? DEFAULT_COLUMN_META;
}

function pgJsonLiteral(defaultValue: string): string {
  return `'${defaultValue.replace(/\\/g, "\\\\").replace(/'/g, "''")}'::jsonb`;
}

function pgNullValue(meta: ColumnMeta): string {
  if (meta.kind === "json" && !meta.nullable) {
    return pgJsonLiteral(meta.jsonDefault);
  }
  return "NULL";
}

function mysqlJsonLiteral(defaultValue: string): string {
  return `'${defaultValue.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function mysqlNullValue(meta: ColumnMeta): string {
  if (meta.kind === "json" && !meta.nullable) {
    return mysqlJsonLiteral(meta.jsonDefault);
  }
  return "NULL";
}

function mysqlValueToMysql(value: string, meta: ColumnMeta): string {
  if (value.startsWith("__BYTEA__")) return `X'${value.slice(9)}'`;
  if (meta.kind === "boolean") return value === "1" ? "1" : "0";
  if (meta.kind === "json") return mysqlJsonLiteral(value);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) return `'${value}'`;
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let seed: SeedMode | "all" | null = null;
  let noSeed = false;
  let pgFromMysql = false;
  let fixMysqlJson = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--seed" && args[i + 1]) {
      const value = args[++i];
      if (value === "all" || value === "blank" || value === "demo-brt" || value === "demo-safar") {
        seed = value;
      } else {
        throw new Error(`Unknown --seed value: ${value}`);
      }
    } else if (args[i] === "--no-seed") {
      noSeed = true;
    } else if (args[i] === "--pg-from-mysql" || args[i] === "--pg-from-csv") {
      pgFromMysql = true;
    } else if (args[i] === "--fix-mysql-json") {
      fixMysqlJson = true;
    }
  }

  return { seed, noSeed, pgFromMysql, fixMysqlJson };
}

function run(command: string) {
  const result = spawnSync(command, {
    stdio: "inherit",
    cwd: ROOT,
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureDirs() {
  for (const dir of [MYSQL_DIR, PG_DIR, CSV_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
}

function wrapMysqlSchema(raw: string): string {
  return [
    "-- AZURA — MySQL 8+ schema (generated from prisma/schema/mysql/)",
    "-- Import via phpMyAdmin: select database → Import → choose this file",
    "",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
    raw.trim(),
    "",
    "SET FOREIGN_KEY_CHECKS = 1;",
    "",
  ].join("\n");
}

function wrapPostgresSchema(raw: string): string {
  return [
    "-- AZURA — PostgreSQL schema for Supabase (generated from prisma/schema/postgresql/)",
    "-- Run in Supabase SQL Editor before importing CSV data",
    "",
    raw.trim(),
    "",
  ].join("\n");
}

function generateSchemas() {
  console.log("Generating MySQL schema…");
  run(
    "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema/mysql --script -o database/mysql/01-schema.raw.sql"
  );
  const mysqlRaw = readFileSync(join(MYSQL_DIR, "01-schema.raw.sql"), "utf-8");
  writeFileSync(join(MYSQL_DIR, "01-schema.sql"), wrapMysqlSchema(mysqlRaw));
  rmSync(join(MYSQL_DIR, "01-schema.raw.sql"), { force: true });

  console.log("Generating PostgreSQL schema…");
  run(
    "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema/postgresql --script -o database/postgres/01-schema.raw.sql"
  );
  const pgRaw = readFileSync(join(PG_DIR, "01-schema.raw.sql"), "utf-8");
  writeFileSync(join(PG_DIR, "01-schema.sql"), wrapPostgresSchema(pgRaw));
  rmSync(join(PG_DIR, "01-schema.raw.sql"), { force: true });

  console.log("Schema files written to database/mysql and database/postgres");
}

async function seedDatabase(mode: SeedMode) {
  console.log(`Seeding database (${mode})…`);
  run("npm run db:zero-data");
  if (mode === "demo-brt") {
    await seedBrtWebsite(prisma);
  } else if (mode === "demo-safar") {
    await seedSafarWebsite(prisma);
  }
}

function pgSqlEscape(value: unknown, meta: ColumnMeta = DEFAULT_COLUMN_META): string {
  if (value === null || value === undefined || (meta.kind === "json" && value === "")) {
    return pgNullValue(meta);
  }
  if (meta.kind === "boolean") {
    if (typeof value === "boolean") return value ? "true" : "false";
    return value === 1 || value === "1" ? "true" : "false";
  }
  if (value instanceof Date) {
    if (meta.kind === "date") return `'${value.toISOString().slice(0, 10)}'::date`;
    return `'${value.toISOString().slice(0, 23).replace("T", " ")}'::timestamp(3)`;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Buffer.isBuffer(value)) return `'\\x${value.toString("hex")}'::bytea`;
  if (typeof value === "object") {
    const json = `'${JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
    return meta.kind === "json" ? `${json}::jsonb` : json;
  }
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function parseMysqlValueList(raw: string): Array<string | null> {
  const values: Array<string | null> = [];
  let i = 0;

  while (i < raw.length) {
    while (i < raw.length && (raw[i] === " " || raw[i] === ",")) i++;
    if (i >= raw.length) break;

    if (raw.startsWith("NULL", i) && (i + 4 >= raw.length || raw[i + 4] === ",")) {
      values.push(null);
      i += 4;
      continue;
    }

    if (raw[i] === "'") {
      let val = "";
      i++;
      while (i < raw.length) {
        if (raw[i] === "'" && raw[i + 1] === "'") {
          val += "'";
          i += 2;
        } else if (raw[i] === "'") {
          i++;
          break;
        } else if (raw[i] === "\\" && i + 1 < raw.length) {
          val += raw[i + 1];
          i += 2;
        } else {
          val += raw[i++];
        }
      }
      values.push(val);
      continue;
    }

    if (raw.startsWith("X'", i)) {
      let val = "";
      i += 2;
      while (i < raw.length && raw[i] !== "'") {
        val += raw[i++];
      }
      i++;
      values.push(`__BYTEA__${val}`);
      continue;
    }

    let token = "";
    while (i < raw.length && raw[i] !== ",") {
      token += raw[i++];
    }
    values.push(token.trim());
  }

  return values;
}

function mysqlValueToPg(value: string | null, meta: ColumnMeta): string {
  if (value === null || (meta.kind === "json" && value === "")) return pgNullValue(meta);
  if (value.startsWith("__BYTEA__")) {
    return `'\\x${value.slice(9)}'::bytea`;
  }
  if (meta.kind === "boolean") return value === "1" ? "true" : "false";
  if (meta.kind === "json") {
    return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'::jsonb`;
  }
  if (meta.kind === "date") return `'${value.slice(0, 10)}'::date`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
    return `'${value}'::timestamp(3)`;
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function sqlEscape(value: unknown, meta: ColumnMeta = DEFAULT_COLUMN_META): string {
  if (value === null || value === undefined || (meta.kind === "json" && value === "")) {
    return mysqlNullValue(meta);
  }
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 23).replace("T", " ")}'`;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    return `"${str.replace(/"/g, '""')}"`;
  }
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function resolveTableName(raw: string): string {
  const hit = PRISMA_TABLES.find((name) => name.toLowerCase() === raw.toLowerCase());
  return hit ?? raw;
}

async function listTables(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`
  );
  return rows
    .map((r) => resolveTableName(r.TABLE_NAME))
    .filter((name) => !SKIP_SEED_TABLES.has(name));
}

async function exportTable(table: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM \`${table}\``
  );
  if (rows.length === 0) return { table, rows: [], columns: [] as string[] };

  const columns = Object.keys(rows[0]);
  return { table, rows, columns };
}

function writeCombinedImport(label: string) {
  const schema = readFileSync(join(MYSQL_DIR, "01-schema.sql"), "utf-8");
  const seed = readFileSync(join(MYSQL_DIR, `02-seed-${label}.sql`), "utf-8");
  writeFileSync(
    join(MYSQL_DIR, `import-${label}.sql`),
    [
      `-- AZURA one-file import: ${label}`,
      "-- phpMyAdmin: create empty database → Import this file",
      "",
      schema.trim(),
      "",
      seed.trim(),
      "",
    ].join("\n"),
    "utf-8"
  );
}

function writeCombinedPostgresImport(label: string) {
  const schema = readFileSync(join(PG_DIR, "01-schema.sql"), "utf-8");
  const seed = readFileSync(join(PG_DIR, `02-seed-${label}.sql`), "utf-8");
  writeFileSync(
    join(PG_DIR, `import-${label}.sql`),
    [
      `-- AZURA one-file import: ${label}`,
      "-- Supabase SQL Editor: run this file on an empty database",
      "",
      schema.trim(),
      "",
      seed.trim(),
      "",
    ].join("\n"),
    "utf-8"
  );
}

function writePostgresSeed(label: string, inserts: string[]) {
  const outPg = join(PG_DIR, `02-seed-${label}.sql`);
  const pgSqlParts = [
    `-- AZURA seed data: ${label}`,
    "-- Import AFTER 01-schema.sql (Supabase SQL Editor)",
    "",
    "SET session_replication_role = 'replica';",
    "",
    ...inserts,
    "SET session_replication_role = 'origin';",
    "",
  ];
  writeFileSync(outPg, pgSqlParts.join("\n"), "utf-8");
  writeCombinedPostgresImport(label);
  return outPg;
}

function fixMysqlSeedJsonNulls(label: string) {
  const mysqlSeedPath = join(MYSQL_DIR, `02-seed-${label}.sql`);
  if (!existsSync(mysqlSeedPath)) {
    throw new Error(`Missing MySQL seed for ${label}: ${mysqlSeedPath}`);
  }

  const lines = readFileSync(mysqlSeedPath, "utf-8").split("\n");
  const fixed: string[] = [];
  let changes = 0;

  for (const line of lines) {
    const insertMatch = line.match(/^INSERT INTO `(\w+)` \((.+)\) VALUES \((.+)\);$/);
    if (!insertMatch) {
      fixed.push(line);
      continue;
    }

    const [, table, colsRaw, valsRaw] = insertMatch;
    const columns = colsRaw.split(/`,\s*`/).map((col) => col.replace(/`/g, ""));
    const values = parseMysqlValueList(valsRaw);
    let changed = false;

    const mysqlValues = columns
      .map((col, index) => {
        const meta = getColumnMeta(table, col);
        const raw = values[index] ?? null;
        if (raw === null || (meta.kind === "json" && raw === "")) {
          const replacement = mysqlNullValue(meta);
          if (replacement !== "NULL") changed = true;
          return replacement;
        }
        return mysqlValueToMysql(raw, meta);
      })
      .join(", ");

    if (changed) changes++;
    fixed.push(
      `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${mysqlValues});`
    );
  }

  writeFileSync(mysqlSeedPath, fixed.join("\n"), "utf-8");
  writeCombinedImport(label);
  console.log(`  ${label}: fixed ${changes} MySQL INSERT(s) → ${mysqlSeedPath}`);
}

function exportPostgresFromMysql(label: string) {
  const mysqlSeedPath = join(MYSQL_DIR, `02-seed-${label}.sql`);
  if (!existsSync(mysqlSeedPath)) {
    throw new Error(`Missing MySQL seed for ${label}: ${mysqlSeedPath}`);
  }

  const lines = readFileSync(mysqlSeedPath, "utf-8").split("\n");
  const inserts: string[] = [];
  let totalRows = 0;
  let currentTable = "";
  let currentTableRows = 0;

  const flushTable = () => {
    if (currentTable && currentTableRows > 0) {
      inserts.push("");
    }
    currentTable = "";
    currentTableRows = 0;
  };

  for (const line of lines) {
    const commentMatch = line.match(/^-- (\w+) \((\d+) rows\)/);
    if (commentMatch) {
      flushTable();
      currentTable = commentMatch[1];
      inserts.push(line);
      continue;
    }

    const insertMatch = line.match(/^INSERT INTO `(\w+)` \((.+)\) VALUES \((.+)\);$/);
    if (!insertMatch) continue;

    const table = insertMatch[1];
    const columns = insertMatch[2].split(/`,\s*`/).map((col) => col.replace(/`/g, ""));
    const values = parseMysqlValueList(insertMatch[3]);
    const pgValues = columns
      .map((col, index) => mysqlValueToPg(values[index] ?? null, getColumnMeta(table, col)))
      .join(", ");

    inserts.push(
      `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${pgValues});`
    );
    currentTableRows++;
    totalRows++;
  }

  flushTable();
  const outPg = writePostgresSeed(label, inserts);
  console.log(`  ${label}: ${totalRows} rows → ${outPg}`);
}

let seedAdminHashPromise: Promise<string> | null = null;

async function getSeedAdminPasswordHash(): Promise<string> {
  if (!seedAdminHashPromise) {
    seedAdminHashPromise = bcrypt.hash(getSeedAdminPassword(), 12);
  }
  return seedAdminHashPromise;
}

const SYSTEM_SETTINGS_JSON =
  '{"setupComplete":false,"comingSoonEnabled":false,"registrationEnabled":true}';

function patchExportedRow(
  table: string,
  row: Record<string, unknown>,
  label: string,
  adminEmail: string,
  adminHash: string
): Record<string, unknown> {
  if (table === "User" && row.role === "ADMIN") {
    return { ...row, email: adminEmail, passwordHash: adminHash };
  }
  if (
    label === "blank" &&
    table === "JsonStore" &&
    row.namespace === "settings" &&
    row.key === "system"
  ) {
    return { ...row, data: SYSTEM_SETTINGS_JSON };
  }
  return row;
}

async function writeResetAdminSql(adminEmail: string, adminHash: string) {
  const mysqlSql = `-- AZURA — reset admin user (MySQL)
-- Login after running:
--   Email:    ${adminEmail}
--   Password: ${getSeedAdminPassword()}

DELETE FROM \`User\` WHERE \`role\` = 'ADMIN' OR \`email\` = '${adminEmail}';

INSERT INTO \`User\` (
  \`id\`,
  \`email\`,
  \`passwordHash\`,
  \`name\`,
  \`role\`,
  \`marketingOptIn\`,
  \`createdAt\`,
  \`updatedAt\`
) VALUES (
  'cmpv9625i0000hf2wf3ora99k',
  '${adminEmail}',
  '${adminHash}',
  'Admin',
  'ADMIN',
  0,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  \`passwordHash\` = VALUES(\`passwordHash\`),
  \`name\` = 'Admin',
  \`role\` = 'ADMIN',
  \`updatedAt\` = NOW();
`;

  const pgSql = `-- AZURA — reset admin user (PostgreSQL / Supabase)
-- Only use when setup is already complete (setupComplete: true).
-- For a fresh deploy, use reset-setup.sql and run the /setup wizard instead.
--
-- Login after running:
--   Email:    ${adminEmail}
--   Password: ${getSeedAdminPassword()}

DELETE FROM "User" WHERE "role" = 'ADMIN' OR "email" = '${adminEmail}';

INSERT INTO "User" (
  "id",
  "email",
  "passwordHash",
  "name",
  "role",
  "marketingOptIn",
  "createdAt",
  "updatedAt"
) VALUES (
  'cmpv9625i0000hf2wf3ora99k',
  '${adminEmail}',
  '${adminHash}',
  'Admin',
  'ADMIN',
  false,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = 'Admin',
  "role" = 'ADMIN',
  "updatedAt" = NOW();
`;

  writeFileSync(join(MYSQL_DIR, "reset-admin.sql"), mysqlSql, "utf-8");
  writeFileSync(join(PG_DIR, "reset-admin.sql"), pgSql, "utf-8");
  console.log("  reset-admin.sql → mysql/, postgres/");
}

function writeResetSetupSql() {
  const pgSql = `-- AZURA — force setup wizard (PostgreSQL / Supabase one-time fix)
-- Run in Supabase SQL Editor after deploying code that trusts JsonStore setupComplete.
-- Then visit the site — you should land on /setup and create the admin via the wizard.

UPDATE "JsonStore"
SET "data" = '{"setupComplete":false,"comingSoonEnabled":false,"registrationEnabled":true}'::jsonb
WHERE "namespace" = 'settings' AND "key" = 'system';

DELETE FROM "User" WHERE "role" = 'ADMIN';
`;

  const mysqlSql = `-- AZURA — force setup wizard (MySQL one-time fix)
-- Run in phpMyAdmin after deploying code that trusts JsonStore setupComplete.
-- Then visit the site — you should land on /setup and create the admin via the wizard.

UPDATE \`JsonStore\`
SET \`data\` = '{"setupComplete":false,"comingSoonEnabled":false,"registrationEnabled":true}'
WHERE \`namespace\` = 'settings' AND \`key\` = 'system';

DELETE FROM \`User\` WHERE \`role\` = 'ADMIN';
`;

  writeFileSync(join(PG_DIR, "reset-setup.sql"), pgSql, "utf-8");
  writeFileSync(join(MYSQL_DIR, "reset-setup.sql"), mysqlSql, "utf-8");
  console.log("  reset-setup.sql → mysql/, postgres/");
}

async function exportDataset(label: string) {
  const tables = await listTables();
  const adminEmail = getSeedAdminEmail();
  const adminHash = label === "blank" ? "" : await getSeedAdminPasswordHash();
  const outMysql = join(MYSQL_DIR, `02-seed-${label}.sql`);
  const outCsvDir = join(CSV_DIR, label);
  if (existsSync(outCsvDir)) {
    for (const file of readdirSync(outCsvDir)) {
      if (file.endsWith(".csv")) rmSync(join(outCsvDir, file), { force: true });
    }
  } else {
    mkdirSync(outCsvDir, { recursive: true });
  }

  const sqlParts = [
    `-- AZURA seed data: ${label}`,
    "-- Import AFTER 01-schema.sql (phpMyAdmin → Import)",
    "",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
  ];

  const pgInserts: string[] = [];
  const manifest: { table: string; rows: number; csv: string }[] = [];

  for (const table of tables) {
    let { rows, columns } = await exportTable(table);

    if (table === "User" && label === "blank") {
      rows = [];
    } else if (table === "User") {
      rows = rows.map((row) => patchExportedRow(table, row, label, adminEmail, adminHash));
    } else {
      rows = rows.map((row) => patchExportedRow(table, row, label, adminEmail, adminHash));
    }

    const csvPath = join(outCsvDir, `${table}.csv`);
    const header = columns.join(",");
    const body = rows.map((row) => columns.map((col) => csvEscape(row[col])).join(","));
    writeFileSync(csvPath, [header, ...body].join("\n") + (rows.length ? "\n" : ""), "utf-8");

    manifest.push({
      table,
      rows: rows.length,
      csv: `database/csv/${label}/${table}.csv`,
    });

    if (rows.length === 0) continue;

    sqlParts.push(`-- ${table} (${rows.length} rows)`);
    pgInserts.push(`-- ${table} (${rows.length} rows)`);
    for (const row of rows) {
      const values = columns
        .map((col) => sqlEscape(row[col], getColumnMeta(table, col)))
        .join(", ");
      sqlParts.push(
        `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${values});`
      );

      const pgValues = columns
        .map((col) => pgSqlEscape(row[col], getColumnMeta(table, col)))
        .join(", ");
      pgInserts.push(
        `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${pgValues});`
      );
    }
    sqlParts.push("");
    pgInserts.push("");
  }

  sqlParts.push("SET FOREIGN_KEY_CHECKS = 1;", "");
  writeFileSync(outMysql, sqlParts.join("\n"), "utf-8");
  const outPg = writePostgresSeed(label, pgInserts);

  writeFileSync(
    join(outCsvDir, "_manifest.json"),
    JSON.stringify(
      {
        label,
        generatedAt: new Date().toISOString(),
        tables: manifest,
        adminLogin: {
          email: getSeedAdminEmail(),
          password: getSeedAdminPassword(),
          note:
            label === "blank"
              ? "No admin user in blank export — complete /setup wizard on first visit"
              : "Demo seed admin; password hash generated at export time from SEED_ADMIN_*",
        },
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );

  writeCombinedImport(label);

  const totalRows = manifest.reduce((sum, m) => sum + m.rows, 0);
  console.log(`  ${label}: ${tables.length} tables, ${totalRows} rows → ${outMysql}, ${outPg}`);
}

async function main() {
  const { seed, noSeed, pgFromMysql, fixMysqlJson } = parseArgs();
  ensureDirs();
  generateSchemas();

  if (noSeed && !seed && !pgFromMysql && !fixMysqlJson) {
    console.log("Schema only (use --seed blank|demo-brt|demo-safar|all to export data).");
    return;
  }

  const modes: SeedMode[] =
    seed === "all"
      ? ["blank", "demo-brt", "demo-safar"]
      : seed
        ? [seed]
        : [];

  if (fixMysqlJson) {
    if (modes.length === 0) {
      throw new Error("--fix-mysql-json requires --seed blank|demo-brt|demo-safar|all");
    }
    console.log("Fixing required JSON defaults in MySQL seed SQL…");
    for (const mode of modes) {
      fixMysqlSeedJsonNulls(mode);
      exportPostgresFromMysql(mode);
    }
    const adminHash = await getSeedAdminPasswordHash();
    await writeResetAdminSql(getSeedAdminEmail(), adminHash);
    writeResetSetupSql();
    console.log("MySQL + PostgreSQL seed fix complete.");
    return;
  }

  if (pgFromMysql) {
    if (modes.length === 0) {
      throw new Error("--pg-from-mysql requires --seed blank|demo-brt|demo-safar|all");
    }
    console.log("Generating PostgreSQL seeds from MySQL SQL…");
    for (const mode of modes) {
      exportPostgresFromMysql(mode);
    }
    const adminHash = await getSeedAdminPasswordHash();
    await writeResetAdminSql(getSeedAdminEmail(), adminHash);
    writeResetSetupSql();
    console.log("PostgreSQL export complete.");
    return;
  }

  if (modes.length === 0) {
    console.log("No data export requested. Add --seed blank|demo-brt|demo-safar|all");
    return;
  }

  for (const mode of modes) {
    if (!noSeed) {
      await seedDatabase(mode);
    }
    await exportDataset(mode);
  }

  const adminHash = await getSeedAdminPasswordHash();
  await writeResetAdminSql(getSeedAdminEmail(), adminHash);
  writeResetSetupSql();

  console.log("Export complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
