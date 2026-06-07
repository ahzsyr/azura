import "server-only";



import { prisma } from "@/lib/prisma";

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
  hasFixableDatabaseUrlFormatting,
  isDatabaseUrlMalformed,
  sanitizeDatabaseUrl,
} from "@/lib/database-url";

function logSetupDbError(context: string, error: unknown) {

  const message = error instanceof Error ? error.message : String(error);

  console.error(`[setup] ${context}:`, message);

}

function getDatabaseUrlProtocol() {
  const url = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  return url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1] ?? "unset";
}

function getSanitizedDatabaseInfo() {
  const url = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  const host = url.match(/@([^/:?]+)/)?.[1] ?? "unset";
  const user = url.match(/\/\/([^:]+):/)?.[1] ?? "unset";
  const projectRef = user.includes(".") ? user.split(".")[1] : user.replace(/^postgres$/, "direct");
  return { dbProtocol: getDatabaseUrlProtocol(), host, projectRef };
}

let lastDatabaseProbeError: string | null = null;

function summarizeDatabaseProbeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (isDatabaseUrlMalformed()) {
    return 'DATABASE_URL is missing or invalid. In hPanel/Vercel set the value to a full postgresql://… URI (no DATABASE_URL= prefix, no quotes). Add PRISMA_SCHEMA=postgresql, redeploy, and restart.';
  }
  if (hasFixableDatabaseUrlFormatting()) {
    return "DATABASE_URL is set with extra quotes or a DATABASE_URL= prefix. The app can still connect after sanitization, but clean up hPanel/Vercel so the value is only the postgresql://… URI, then restart the app.";
  }
  if (message.includes("Invalid `prisma.$queryRaw()`") || message.includes("Invalid `prisma.")) {
    return "Prisma client does not match DATABASE_URL (often MySQL client with a PostgreSQL URL). Set PRISMA_SCHEMA=postgresql, fix DATABASE_URL format, redeploy, and restart the app.";
  }
  if (message.includes("Can't reach database server")) {
    return "Cannot reach Supabase PostgreSQL. Restore/unpause the project in Supabase Dashboard, then verify DATABASE_URL in hPanel.";
  }
  if (message.includes("postgresql://") || message.includes("postgres://")) {
    return "DATABASE_URL must use postgresql:// (not mysql://). Regenerate Prisma: npm run db:generate";
  }
  if (message.includes("EMAXCONNSESSION") || message.includes("max clients reached")) {
    return "Supabase connection pool exhausted. Use BUILD_WITHOUT_DB during deploy build, or switch DATABASE_URL to transaction pooler (port 6543, ?pgbouncer=true).";
  }
  if (message.includes("ECIRCUITBREAKER") || message.includes("too many authentication failures")) {
    return "Supabase temporarily blocked connections after repeated wrong passwords. Wait 15–30 minutes, reset the database password in Supabase Dashboard, then update DATABASE_URL in hPanel with the new password (@ as %40) and restart the app.";
  }
  if (
    message.includes("tenant") ||
    message.includes("Tenant") ||
    message.includes("ENOTFOUND")
  ) {
    return "Supabase pooler host or project ref is wrong. Copy the full DATABASE_URL from Supabase → Database → Connection string → URI (host varies by region, e.g. aws-1-ap-southeast-2).";
  }
  if (
    message.includes("Authentication failed") ||
    message.includes("credentials for") ||
    message.includes("password")
  ) {
    const info = getSanitizedDatabaseInfo();
    if (
      info.projectRef === "xxvvokguzrcrshplzqwp" &&
      info.host.includes("ap-southeast-2")
    ) {
      return "DATABASE_URL host and project are correct, but the password does not match Supabase. In Supabase Dashboard → Database → Reset database password, copy the new connection URI into hPanel (@ as %40), then restart the app.";
    }
    return "Database authentication failed. In hPanel set DATABASE_URL exactly from Supabase (pooler host aws-1-ap-southeast-2, project xxvvokguzrcrshplzqwp, password @ encoded as %40). Remove stale DATABASE_URL from .env/.env.local on the server.";
  }
  return message.split("\n").map((line) => line.trim()).filter(Boolean)[0] ?? "Database connection failed";
}



export async function isSetupDatabaseReady(): Promise<boolean> {

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

    await prisma.$queryRaw`SELECT 1`;

    lastDatabaseProbeError = null;

    return true;

  } catch (error) {

    logSetupDbError("database probe failed", error);
    lastDatabaseProbeError = summarizeDatabaseProbeError(error);
    // #region agent log
    import("@/lib/debug-ingest").then(({ debugIngest }) =>
      debugIngest(
        "setup.service.ts:isSetupDatabaseReady",
        "database probe failed",
        {
          malformed: isDatabaseUrlMalformed(),
          needsCleanup: hasFixableDatabaseUrlFormatting(),
          error: (lastDatabaseProbeError ?? "").slice(0, 200),
        },
        "H6",
      ),
    );
    // #endregion

    return false;

  }

}



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

  await jsonStoreService.set(SYSTEM_SETTINGS_NAMESPACE, SYSTEM_SETTINGS_KEY, next);

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

export async function isComingSoonEnabled(): Promise<boolean> {

  const envOverride = getComingSoonEnvOverride();

  if (envOverride !== null) return envOverride;

  const settings = await readSystemSettings();

  return settings.comingSoonEnabled;

}



export function getComingSoonEnvOverrideForAdmin(): boolean | null {

  return getComingSoonEnvOverride();

}



export function isValidSetupToken(token: string | null | undefined): boolean {

  const expected = process.env.SETUP_TOKEN?.trim();

  if (!expected) return false;

  return Boolean(token?.trim() && token.trim() === expected);

}



export async function getSetupStatus() {

  const databaseReady = await isSetupDatabaseReady();

  const settings = await readSystemSettings();

  const complete = settings.setupComplete;

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

  };

}

