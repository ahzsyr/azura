import "server-only";

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRuntimeDatabaseUrl } from "@/lib/database-url";
import {
  isIgnorableMysqlSchemaError,
  mysqlSchemaStatements,
} from "@/features/setup/mysql-schema-statements";

/** Stable message shown when DB connects but core tables are missing. */
export const SETUP_SCHEMA_MISSING_MESSAGE =
  "Database schema is not applied (User table missing). Completing setup will try to apply migrations. If that fails, run `npm run deploy:hostinger-db` or import blank SQL, and do not set SKIP_DB_MIGRATE=1 on an empty database.";

export function isSetupSchemaMissingMessage(message: string | null | undefined): boolean {
  return Boolean(message?.includes("Database schema is not applied"));
}

function isMissingTableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("P2021") ||
    message.includes("does not exist in the current database") ||
    /table [`']?User[`']? does(?:n't| not) exist/i.test(message)
  );
}

function summarizeSchemaEnsureFailure(detail: string): string {
  const text = detail.trim();
  if (!text) return SETUP_SCHEMA_MISSING_MESSAGE;

  if (/Authentication failed|credentials for|P1000/i.test(text)) {
    return (
      "Database authentication failed while applying schema. " +
      "In hPanel, verify DATABASE_URL password (URL-encode special characters), " +
      "set HOSTINGER_MYSQL_LOCALHOST=1 when MySQL is on the same Hostinger server, " +
      "restart the app, then try Complete setup again."
    );
  }

  if (/Local prisma package missing|prisma package missing/i.test(text)) {
    return (
      "Prisma CLI is missing on the host (needed to create tables). " +
      "Redeploy with a standalone build that includes node_modules/prisma, or run `npm install` / `npm run deploy:hostinger-db` over SSH, then retry."
    );
  }

  return text.length > 500 ? `${text.slice(0, 500)}…` : text;
}

let lastSetupSchemaGap: string | null = null;

export function takeSetupSchemaGapMessage(): string | null {
  const message = lastSetupSchemaGap;
  lastSetupSchemaGap = null;
  return message;
}

export async function isSetupSchemaReady(): Promise<boolean> {
  lastSetupSchemaGap = null;
  const probes = [
    () => prisma.user.findFirst({ select: { id: true }, take: 1 }),
    () => prisma.companyInfo.findFirst({ select: { id: true }, take: 1 }),
    () => prisma.jsonStore.findFirst({ select: { id: true }, take: 1 }),
    () => prisma.siteTheme.findFirst({ select: { id: true }, take: 1 }),
    () => prisma.packageInstallation.findFirst({ select: { packageId: true }, take: 1 }),
  ];
  for (const probe of probes) {
    try {
      await probe();
    } catch (error) {
      if (isMissingTableError(error)) {
        lastSetupSchemaGap = setupSchemaErrorMessage(error);
        return false;
      }
      throw error;
    }
  }
  return true;
}

/** Name the missing table or column. The generic User message is only for User itself. */
export function setupSchemaErrorMessage(error: unknown): string | null {
  if (!isMissingTableError(error)) return null;
  const message = error instanceof Error ? error.message : String(error);
  const column =
    message.match(/The column [`']?([\w.]+)[`']? does not exist/i)?.[1] ??
    message.match(/Unknown column [`']([^']+)[`']/i)?.[1];
  const table =
    message.match(/The table `([^`]+)` does not exist/i)?.[1] ??
    message.match(/Table '[^.]+\.([^']+)' doesn't exist/i)?.[1] ??
    message.match(/table [`']([A-Za-z0-9_]+)[`'] does(?:n't| not) exist/i)?.[1];
  const subject = column
    ? `${column} is missing`
    : table && table.toLowerCase() !== "user"
      ? `${table} table missing`
      : "User table missing";
  return `Database schema is not applied (${subject}). Completing setup will try to apply migrations. If that fails, run \`npm run deploy:hostinger-db\` or import blank SQL, and do not set SKIP_DB_MIGRATE=1 on an empty database.`;
}

function resolvePrismaCli(cwd: string): string | null {
  const entry = path.join(cwd, "node_modules", "prisma", "build", "index.js");
  return existsSync(entry) ? entry : null;
}

function resolvePrismaSchemaPath(): string {
  return "prisma/schema/mysql";
}

/** Child migrate/push must use the same runtime URL as the app (Hostinger localhost override). */
function childEnvWithoutSkipMigrate(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.SKIP_DB_MIGRATE;
  const runtimeUrl = getRuntimeDatabaseUrl();
  if (runtimeUrl) {
    env.DATABASE_URL = runtimeUrl;
  }
  return env;
}

function commandDetail(result: {
  status: number | null;
  stdout?: string | null;
  stderr?: string | null;
}): string {
  const text = `${result.stderr ?? ""}\n${result.stdout ?? ""}`.trim();
  const tail = text.split("\n").filter(Boolean).slice(-12).join(" ");
  return tail || `exit ${result.status ?? 1}`;
}

function runNodeScript(scriptRelative: string): { ok: boolean; detail: string } {
  const root = process.cwd();
  const script = path.join(root, scriptRelative);
  if (!existsSync(script)) {
    return { ok: false, detail: `Missing ${scriptRelative}` };
  }
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    env: childEnvWithoutSkipMigrate(),
    shell: false,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const ok = (result.status ?? 1) === 0;
  return { ok, detail: commandDetail(result) };
}

function runPrismaDbPush(): { ok: boolean; detail: string } {
  const root = process.cwd();
  const cli = resolvePrismaCli(root);
  if (!cli) {
    return { ok: false, detail: "Local prisma package missing — run npm install" };
  }
  const schema = resolvePrismaSchemaPath();
  const result = spawnSync(
    process.execPath,
    [cli, "db", "push", "--schema", schema, "--skip-generate"],
    {
      cwd: root,
      env: childEnvWithoutSkipMigrate(),
      shell: false,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  const ok = (result.status ?? 1) === 0;
  return { ok, detail: commandDetail(result) };
}

const PLATFORM_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS \`SiteFeature\` (
    \`kind\` VARCHAR(16) NOT NULL,
    \`featureId\` VARCHAR(64) NOT NULL,
    \`enabled\` BOOLEAN NOT NULL DEFAULT true,
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`kind\`, \`featureId\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS \`PackageInstallation\` (
    \`packageId\` VARCHAR(64) NOT NULL,
    \`kind\` VARCHAR(16) NOT NULL,
    \`version\` VARCHAR(32) NOT NULL,
    \`status\` VARCHAR(16) NOT NULL,
    \`manifest\` JSON NOT NULL,
    \`installedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    INDEX \`PackageInstallation_status_idx\`(\`status\`),
    PRIMARY KEY (\`packageId\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS \`PackageMigration\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`packageId\` VARCHAR(64) NOT NULL,
    \`version\` VARCHAR(32) NOT NULL,
    \`filename\` VARCHAR(255) NOT NULL,
    \`checksum\` VARCHAR(64) NOT NULL,
    \`direction\` VARCHAR(8) NOT NULL,
    \`appliedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`PackageMigration_packageId_idx\`(\`packageId\`),
    UNIQUE INDEX \`PackageMigration_packageId_filename_direction_key\`(\`packageId\`, \`filename\`, \`direction\`),
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`PackageMigration_packageId_fkey\` FOREIGN KEY (\`packageId\`) REFERENCES \`PackageInstallation\`(\`packageId\`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

/** Literal path so the Next server trace ships this file with the Hostinger bundle. */
function readCoreSchemaSql(): { sql: string | null; detail: string } {
  if (!existsSync(path.join(process.cwd(), "database/mysql/01-schema.sql"))) {
    return {
      sql: null,
      detail: `Missing ${path.join(process.cwd(), "database/mysql/01-schema.sql")}`,
    };
  }
  return {
    sql: readFileSync(path.join(process.cwd(), "database/mysql/01-schema.sql"), "utf8"),
    detail: "",
  };
}

/** Create core tables on the connection the app already uses. Does not spawn the Prisma CLI. */
async function applyCoreMysqlSchema(): Promise<{ ok: boolean; detail: string }> {
  const loaded = readCoreSchemaSql();
  if (!loaded.sql) {
    return { ok: false, detail: loaded.detail };
  }
  const statements = [
    ...mysqlSchemaStatements(loaded.sql).filter((statement) =>
      /^CREATE TABLE IF NOT EXISTS\b/i.test(statement),
    ),
    ...mysqlSchemaStatements(PLATFORM_TABLES_SQL),
  ];
  const failures: string[] = [];
  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      if (isIgnorableMysqlSchemaError(error)) continue;
      const message = error instanceof Error ? error.message : String(error);
      if (failures.length < 3) failures.push(message.split("\n")[0] ?? message);
      if (/Can't reach database|ECONNREFUSED|server has gone away/i.test(message)) break;
    }
  }
  if (await isSetupSchemaReady()) {
    return { ok: true, detail: failures[0] ?? "" };
  }
  return {
    ok: false,
    detail: failures.join(" | ") || "Schema SQL ran but the User table is still missing.",
  };
}

function stillMissingDetail(label: string, result: { ok: boolean; detail: string }): string {
  if (result.ok) {
    return `${label} exited 0 but the User table is still missing. ${result.detail}`.trim();
  }
  return result.detail;
}

async function applyPlatformTables(): Promise<void> {
  for (const statement of mysqlSchemaStatements(PLATFORM_TABLES_SQL)) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      if (isIgnorableMysqlSchemaError(error)) continue;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[setup] platform table skipped: ${message.split("\n").find((line) => line.trim()) ?? message}`);
    }
  }
}

async function ensureUserProfileColumns(): Promise<void> {
  const columns: [string, string][] = [
    ["phone", "VARCHAR(191) NULL"],
    ["dateOfBirth", "DATE NULL"],
    ["addressLine1", "VARCHAR(191) NULL"],
    ["addressLine2", "VARCHAR(191) NULL"],
    ["city", "VARCHAR(191) NULL"],
    ["state", "VARCHAR(191) NULL"],
    ["postalCode", "VARCHAR(191) NULL"],
    ["country", "VARCHAR(191) NULL"],
    ["marketingOptIn", "BOOLEAN NOT NULL DEFAULT false"],
  ];
  for (const [name, definition] of columns) {
    const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND LOWER(TABLE_NAME) = 'user'
         AND LOWER(COLUMN_NAME) = LOWER(?)`,
      name,
    );
    if (Number(rows[0]?.c ?? 0) > 0) continue;
    await prisma.$executeRawUnsafe(`ALTER TABLE \`User\` ADD COLUMN \`${name}\` ${definition}`);
  }
}

/**
 * Apply database/mysql/01-schema.sql on the live connection, then the deploy migrate script, until User exists.
 * A command that exits 0 without creating User is a failure and its output is returned.
 * SKIP_DB_MIGRATE is removed so an empty database is not skipped.
 */
export async function ensureSetupSchemaBestEffort(): Promise<{
  ready: boolean;
  attempted: boolean;
  detail?: string;
}> {
  await applyPlatformTables();
  await ensureUserProfileColumns().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[setup] User profile columns skipped: ${message.split("\n").find((line) => line.trim()) ?? message}`);
  });
  if (await isSetupSchemaReady()) {
    return { ready: true, attempted: true };
  }

  const details: string[] = [];
  const applied = await applyCoreMysqlSchema();
  if (await isSetupSchemaReady()) {
    return { ready: true, attempted: true };
  }
  details.push(stillMissingDetail("Schema SQL", applied));

  const migrate = runNodeScript("scripts/deploy/prisma-migrate-deploy.mjs");
  await applyPlatformTables();
  if (await isSetupSchemaReady()) {
    return { ready: true, attempted: true };
  }
  details.push(stillMissingDetail("Schema migrate", migrate));

  const userExists = await prisma.user
    .findFirst({ select: { id: true }, take: 1 })
    .then(() => true)
    .catch(() => false);
  if (userExists) {
    details.push(
      "Existing data was left in place. prisma db push was not run because it can drop columns on a live database.",
    );
    const first = details.map((line) => line.trim()).find((line) => line.length > 0);
    return {
      ready: false,
      attempted: true,
      detail: summarizeSchemaEnsureFailure(first ?? ""),
    };
  }

  const push = runPrismaDbPush();
  if (await isSetupSchemaReady()) {
    return { ready: true, attempted: true };
  }
  details.push(stillMissingDetail("prisma db push", push));

  const first = details.map((line) => line.trim()).find((line) => line.length > 0);
  return {
    ready: false,
    attempted: true,
    detail: summarizeSchemaEnsureFailure(first ?? ""),
  };
}
