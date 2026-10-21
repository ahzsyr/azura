import "server-only";



import { prisma, resetPrismaClient } from "@/lib/prisma";

import { jsonStoreService } from "@/features/storage/json-store.service";

import {

  defaultSystemSettings,

  SYSTEM_SETTINGS_KEY,

  SYSTEM_SETTINGS_NAMESPACE,

  systemSettingsSchema,

  type SystemSettings,

} from "@/features/setup/system-settings.schema";
import { getComingSoonEnvOverride } from "@/features/setup/setup-env-overrides";
import {
  ensureSetupSchemaBestEffort,
  isSetupSchemaMissingMessage,
  isSetupSchemaReady,
  SETUP_SCHEMA_MISSING_MESSAGE,
  setupSchemaErrorMessage,
  takeSetupSchemaGapMessage,
} from "@/features/setup/setup-schema";
import {
  enableHostingerMysqlLocalhostOverride,
  hasFixableDatabaseUrlFormatting,
  isDatabaseUrlMalformed,
  isHostingerMysqlRemoteHost,
  isMysqlDatabaseUrl,
  sanitizeDatabaseUrl,
} from "@/lib/database-url";

function logSetupDbError(context: string, error: unknown) {

  const message = error instanceof Error ? error.message : String(error);

  console.error(`[setup] ${context}:`, message);

}

function getDatabaseProtocolLabel() {
  const url = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  return url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1] ?? "unset";
}

function getSanitizedDatabaseInfo() {
  const url = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  const host = url.match(/@([^/:?]+)/)?.[1] ?? "unset";
  const user = url.match(/\/\/([^:]+):/)?.[1] ?? "unset";
  const projectRef = user.includes(".") ? user.split(".")[1] : user.replace(/^postgres$/, "direct");
  return { dbProtocol: getDatabaseProtocolLabel(), host, projectRef };
}

let lastDatabaseProbeError: string | null = null;

function isUnreachableMysqlProbeError(message: string): boolean {
  return (
    /Can't reach database server/i.test(message) ||
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH/i.test(message) ||
    /Connection (?:lost|refused|timed out)/i.test(message) ||
    /server has gone away/i.test(message) ||
    /45028|pool failed to retrieve a connection/i.test(message) ||
    /\bP1001\b|\bP1017\b/i.test(message)
  );
}

function isAuthMysqlProbeError(message: string): boolean {
  return (
    /Authentication failed/i.test(message) ||
    /Access denied for user/i.test(message) ||
    /credentials for/i.test(message) ||
    /\bP1000\b/i.test(message) ||
    (/password/i.test(message) && /denied|failed|invalid/i.test(message))
  );
}

function isPrismaClientMismatchError(message: string): boolean {
  return (
    /Unsupported protocol|URL must start with the protocol/i.test(message) ||
    /PrismaClientConstructorValidationError/i.test(message) ||
    /adapter is required|driver adapter/i.test(message) ||
    /Prisma Client could not locate the Query Engine/i.test(message)
  );
}

function summarizeDatabaseProbeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (isDatabaseUrlMalformed() || /postgres(ql)?:\/\//i.test(message)) {
    return "DATABASE_URL is missing or invalid. Azura requires MySQL 8.4 — set a full mysql://… URI in hPanel (no DATABASE_URL= prefix, no quotes), then restart the app.";
  }
  // Prisma wraps driver failures as `Invalid \`prisma.$queryRaw()\``. Inspect the cause first.
  if (isUnreachableMysqlProbeError(message)) {
    return /45028|pool failed to retrieve a connection/i.test(message)
      ? "MySQL did not accept a connection (error 45028, no pooled connections). In hPanel, confirm this site’s DATABASE_URL user and database, set HOSTINGER_MYSQL_LOCALHOST=1 when MySQL is on the same server, then restart."
      : isHostingerMysqlRemoteHost()
        ? "Cannot reach MySQL at the Hostinger remote host. Set HOSTINGER_MYSQL_LOCALHOST=1 (or DATABASE_MYSQL_HOST=localhost) in hPanel, restart the app, and retry."
        : "Cannot reach MySQL. On Hostinger, set HOSTINGER_MYSQL_LOCALHOST=1 (or DATABASE_MYSQL_HOST=localhost), verify the database exists, and import database/mysql/import-blank.sql.";
  }
  if (isAuthMysqlProbeError(message)) {
    const info = getSanitizedDatabaseInfo();
    return `MySQL authentication failed (host: ${info.host}, user: ${info.projectRef}). Verify username, password, and database name in hPanel → Databases, then update DATABASE_URL (URL-encode special characters in the password).`;
  }
  if (isPrismaClientMismatchError(message)) {
    return "Prisma client does not match DATABASE_URL. Run npm run db:generate against the MySQL schema, redeploy, and restart.";
  }
  if (hasFixableDatabaseUrlFormatting()) {
    return "DATABASE_URL is set with extra quotes or a DATABASE_URL= prefix. Remove quotes in hPanel so the value is only mysql://…, then restart the app.";
  }
  return message.split("\n").map((line) => line.trim()).filter(Boolean)[0] ?? "Database connection failed";
}



/** Connectivity only (`SELECT 1`). Does not require schema/tables. */
export async function isSetupDatabaseConnected(): Promise<boolean> {
  try {
    const url = sanitizeDatabaseUrl(process.env.DATABASE_URL);
    if (!url) {
      lastDatabaseProbeError = "DATABASE_URL is not set in deployment environment variables.";
      return false;
    }
    if (isDatabaseUrlMalformed()) {
      lastDatabaseProbeError = summarizeDatabaseProbeError(new Error("invalid DATABASE_URL"));
      return false;
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isUnreachableMysqlProbeError(message) && enableHostingerMysqlLocalhostOverride()) {
        console.warn(
          "[setup] MySQL remote host unreachable — retrying via localhost (HOSTINGER_MYSQL_LOCALHOST=1)",
        );
        resetPrismaClient();
        await prisma.$queryRaw`SELECT 1`;
      } else {
        throw error;
      }
    }
    lastDatabaseProbeError = null;
    return true;
  } catch (error) {
    logSetupDbError("database probe failed", error);
    lastDatabaseProbeError = summarizeDatabaseProbeError(error);
    return false;
  }
}

/** Connected and core schema present (`User` table). */
export async function isSetupDatabaseReady(): Promise<boolean> {
  if (!(await isSetupDatabaseConnected())) {
    return false;
  }

  try {
    if (!(await isSetupSchemaReady())) {
      lastDatabaseProbeError = takeSetupSchemaGapMessage() ?? SETUP_SCHEMA_MISSING_MESSAGE;
      return false;
    }
    lastDatabaseProbeError = null;
    return true;
  } catch (error) {
    logSetupDbError("schema probe failed", error);
    lastDatabaseProbeError = summarizeDatabaseProbeError(error);
    return false;
  }
}

export {
  ensureSetupSchemaBestEffort,
  isSetupSchemaMissingMessage,
  isSetupSchemaReady,
  SETUP_SCHEMA_MISSING_MESSAGE,
  setupSchemaErrorMessage,
};



export async function readSystemSettings(): Promise<SystemSettings> {

  try {

    const stored = await jsonStoreService.get<Partial<SystemSettings>>(

      SYSTEM_SETTINGS_NAMESPACE,

      SYSTEM_SETTINGS_KEY,

    );

    if (!stored) return defaultSystemSettings();

    return systemSettingsSchema.parse({ ...defaultSystemSettings(), ...stored });

  } catch (error) {

    logSetupDbError("readSystemSettings failed — treating as fresh install", error);

    return defaultSystemSettings();

  }

}



export async function writeSystemSettings(

  patch: Partial<SystemSettings>,

): Promise<SystemSettings> {

  const current = await readSystemSettings();

  const next = systemSettingsSchema.parse({ ...current, ...patch });

  await jsonStoreService.set(SYSTEM_SETTINGS_NAMESPACE, SYSTEM_SETTINGS_KEY, next, { revalidate: true });

  return next;

}



/** True when JsonStore settings.system marks setup complete. */

export async function isSetupComplete(): Promise<boolean> {

  const settings = await readSystemSettings();

  return settings.setupComplete;

}



export async function isRegistrationEnabled(): Promise<boolean> {

  const env = process.env.NEXT_PUBLIC_REGISTRATION_ENABLED?.trim().toLowerCase();

  if (env === "false" || env === "0") return false;

  if (env === "true" || env === "1") return true;

  const settings = await readSystemSettings();

  return settings.registrationEnabled;

}

/** Database toggle only. `COMING_SOON_ENABLED` is a middleware fallback when this API is unreachable. */
export async function isComingSoonEnabled(): Promise<boolean> {

  const settings = await readSystemSettings();

  return settings.comingSoonEnabled;

}



export function getComingSoonEnvOverrideForAdmin(): boolean | null {

  return getComingSoonEnvOverride();

}



export {
  authorizeFirstRunSetup,
  authorizeSetupToken,
  getSetupTokenFromEnv,
  isSetupTokenRequired,
  isValidSetupToken,
} from "@/features/setup/setup-token";




import type { SetupDatabaseKind, SetupStatusResult } from "@/features/setup/setup.types";

export type { SetupDatabaseKind, SetupStatusResult } from "@/features/setup/setup.types";

/**
 * A live site already has an admin and company row. That is not a fresh install.
 * Uses raw SQL so a partial schema (missing PackageInstallation/Custom404, etc.) still counts.
 * For public hold + admin full site, enable Coming Soon (Admin → Settings → Site), not setupComplete=false.
 */
async function tableHasRows(table: "User" | "CompanyInfo"): Promise<boolean> {
  const tables = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?)`,
    table,
  );
  if (Number(tables[0]?.c ?? 0) === 0) return false;
  const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) AS c FROM \`${table}\``,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function installedSiteAlreadyExists(): Promise<boolean> {
  try {
    const [hasUser, hasCompany] = await Promise.all([
      tableHasRows("User"),
      tableHasRows("CompanyInfo"),
    ]);
    return hasUser && hasCompany;
  } catch (error) {
    logSetupDbError("existing site probe failed", error);
    return false;
  }
}

export async function getSetupStatus(): Promise<SetupStatusResult> {
  const databaseKind: SetupDatabaseKind = isMysqlDatabaseUrl() ? "mysql" : "unknown";

  try {
    // Status must stay fast for middleware. Do not spawn migrate here — Complete setup owns that.
    const connected = await isSetupDatabaseConnected();
    let databaseReady = false;
    if (connected) {
      try {
        databaseReady = await isSetupSchemaReady();
        if (!databaseReady) {
          lastDatabaseProbeError = takeSetupSchemaGapMessage() ?? SETUP_SCHEMA_MISSING_MESSAGE;
        } else {
          lastDatabaseProbeError = null;
        }
      } catch (error) {
        logSetupDbError("schema probe failed", error);
        lastDatabaseProbeError = summarizeDatabaseProbeError(error);
        databaseReady = false;
      }
    }

    const settings = await readSystemSettings();
    let complete = settings.setupComplete;

    // Existing installs must leave /welcome even when newer tables are still missing.
    if (!complete && connected && (await installedSiteAlreadyExists())) {
      complete = true;
      try {
        await writeSystemSettings({
          setupComplete: true,
          completedAt: settings.completedAt ?? new Date().toISOString(),
        });
      } catch (error) {
        logSetupDbError("could not record the existing site as setup complete", error);
      }
    }

    const registrationEnabled = await isRegistrationEnabled();
    const comingSoonEnabled = await isComingSoonEnabled();

    return {
      setupComplete: complete,
      registrationEnabled,
      comingSoonEnabled,
      comingSoonEnvOverride: getComingSoonEnvOverrideForAdmin(),
      completedAt: settings.completedAt ?? null,
      databaseReady,
      databaseError: databaseReady ? null : lastDatabaseProbeError,
      databaseKind,
    };
  } catch (error) {
    logSetupDbError("getSetupStatus failed", error);
    return {
      setupComplete: false,
      registrationEnabled: true,
      comingSoonEnabled: false,
      comingSoonEnvOverride: getComingSoonEnvOverrideForAdmin(),
      completedAt: null,
      databaseReady: false,
      databaseError: summarizeDatabaseProbeError(error),
      databaseKind,
    };
  }
}

