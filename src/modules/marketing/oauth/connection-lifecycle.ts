import "server-only";
import { sealSecret, unsealSecret } from "@/features/seo/integrations/secret-seal.server";
import { isMysqlDatabaseUrl, isPostgresDatabaseUrl } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getProviderManifest } from "@/modules/marketing/core/registry";
import { assertLifecycleTransition } from "@/modules/marketing/core/lifecycle";
import { buildPermissionEntries, summarizePermissions } from "@/modules/marketing/core/permissions";
import type { ProviderLifecycleState } from "@/modules/marketing/core/manifests/types";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isMissingMarketingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("marketingProviderRuntime") ||
    message.includes("MarketingProviderRuntime") ||
    message.includes("marketingConnection") ||
    message.includes("MarketingConnection") ||
    message.includes("marketingCredential") ||
    message.includes("MarketingCredential") ||
    message.includes("marketingPermissionState") ||
    message.includes("MarketingPermissionState") ||
    message.includes("marketingAccount") ||
    message.includes("MarketingAccount") ||
    message.includes("The table")
  );
}

let schemaEnsured = false;

async function ensureCoreMarketingSchema(): Promise<void> {
  if (schemaEnsured) return;
  if (isPostgresDatabaseUrl()) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingProviderRuntime" (
        "id" TEXT NOT NULL,
        "providerId" VARCHAR(64) NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "installedVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
        "lifecycle" VARCHAR(32) NOT NULL DEFAULT 'discovered',
        "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
        "lastSyncAt" TIMESTAMP(3),
        "healthSummary" TEXT,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingProviderRuntime_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingProviderRuntime_providerId_key"
      ON "MarketingProviderRuntime" ("providerId")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingConnection" (
        "id" TEXT NOT NULL,
        "providerId" VARCHAR(64) NOT NULL,
        "tenantId" VARCHAR(64) NOT NULL DEFAULT 'default',
        "status" VARCHAR(32) NOT NULL DEFAULT 'disconnected',
        "lifecycle" VARCHAR(32) NOT NULL DEFAULT 'configured',
        "oauthMetadata" JSONB NOT NULL DEFAULT '{}',
        "scopesGranted" JSONB NOT NULL DEFAULT '[]',
        "scopesRequired" JSONB NOT NULL DEFAULT '[]',
        "scopesMissing" JSONB NOT NULL DEFAULT '[]',
        "scopesExpired" JSONB NOT NULL DEFAULT '[]',
        "lastHealthAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingConnection_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingConnection_providerId_tenantId_key"
      ON "MarketingConnection" ("providerId", "tenantId")`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MarketingConnection_status_idx"
      ON "MarketingConnection" ("status")`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MarketingConnection_lifecycle_idx"
      ON "MarketingConnection" ("lifecycle")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingCredential" (
        "id" TEXT NOT NULL,
        "connectionId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "tokenType" VARCHAR(32),
        "expiresAt" TIMESTAMP(3),
        "refreshStatus" VARCHAR(32) NOT NULL DEFAULT 'ok',
        "sealedPayload" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingCredential_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCredential_connectionId_key"
      ON "MarketingCredential" ("connectionId")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingPermissionState" (
        "id" TEXT NOT NULL,
        "providerId" VARCHAR(64) NOT NULL,
        "connectionId" VARCHAR(64) NOT NULL,
        "entries" JSONB NOT NULL DEFAULT '[]',
        "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingPermissionState_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingPermissionState_providerId_connectionId_key"
      ON "MarketingPermissionState" ("providerId", "connectionId")`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MarketingPermissionState_lastCheckedAt_idx"
      ON "MarketingPermissionState" ("lastCheckedAt")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarketingAccount" (
        "id" TEXT NOT NULL,
        "connectionId" TEXT NOT NULL,
        "externalAccountId" VARCHAR(128) NOT NULL,
        "accountType" VARCHAR(64) NOT NULL,
        "displayName" VARCHAR(256) NOT NULL,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "isSelected" BOOLEAN NOT NULL DEFAULT false,
        "healthSummary" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketingAccount_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketingAccount_connectionId_externalAccountId_key"
      ON "MarketingAccount" ("connectionId", "externalAccountId")`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MarketingAccount_accountType_idx"
      ON "MarketingAccount" ("accountType")`);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingConnection_providerId_fkey') THEN
          ALTER TABLE "MarketingConnection"
            ADD CONSTRAINT "MarketingConnection_providerId_fkey"
            FOREIGN KEY ("providerId") REFERENCES "MarketingProviderRuntime"("providerId")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingCredential_connectionId_fkey') THEN
          ALTER TABLE "MarketingCredential"
            ADD CONSTRAINT "MarketingCredential_connectionId_fkey"
            FOREIGN KEY ("connectionId") REFERENCES "MarketingConnection"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingAccount_connectionId_fkey') THEN
          ALTER TABLE "MarketingAccount"
            ADD CONSTRAINT "MarketingAccount_connectionId_fkey"
            FOREIGN KEY ("connectionId") REFERENCES "MarketingConnection"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;`);
  } else if (isMysqlDatabaseUrl()) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`MarketingProviderRuntime\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`enabled\` BOOLEAN NOT NULL DEFAULT true,
        \`installedVersion\` VARCHAR(32) NOT NULL DEFAULT '1.0.0',
        \`lifecycle\` VARCHAR(32) NOT NULL DEFAULT 'discovered',
        \`maintenanceMode\` BOOLEAN NOT NULL DEFAULT false,
        \`lastSyncAt\` DATETIME(3) NULL,
        \`healthSummary\` TEXT NULL,
        \`metadata\` JSON NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingProviderRuntime_providerId_key\`(\`providerId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`MarketingConnection\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`tenantId\` VARCHAR(64) NOT NULL DEFAULT 'default',
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'disconnected',
        \`lifecycle\` VARCHAR(32) NOT NULL DEFAULT 'configured',
        \`oauthMetadata\` JSON NOT NULL,
        \`scopesGranted\` JSON NOT NULL,
        \`scopesRequired\` JSON NOT NULL,
        \`scopesMissing\` JSON NOT NULL,
        \`scopesExpired\` JSON NOT NULL,
        \`lastHealthAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingConnection_providerId_tenantId_key\`(\`providerId\`, \`tenantId\`),
        INDEX \`MarketingConnection_status_idx\`(\`status\`),
        INDEX \`MarketingConnection_lifecycle_idx\`(\`lifecycle\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`MarketingCredential\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`connectionId\` VARCHAR(191) NOT NULL,
        \`accessToken\` TEXT NOT NULL,
        \`refreshToken\` TEXT NULL,
        \`tokenType\` VARCHAR(32) NULL,
        \`expiresAt\` DATETIME(3) NULL,
        \`refreshStatus\` VARCHAR(32) NOT NULL DEFAULT 'ok',
        \`sealedPayload\` JSON NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingCredential_connectionId_key\`(\`connectionId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`MarketingPermissionState\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(64) NOT NULL,
        \`connectionId\` VARCHAR(64) NOT NULL,
        \`entries\` JSON NOT NULL,
        \`lastCheckedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingPermissionState_providerId_connectionId_key\`(\`providerId\`, \`connectionId\`),
        INDEX \`MarketingPermissionState_lastCheckedAt_idx\`(\`lastCheckedAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`MarketingAccount\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`connectionId\` VARCHAR(191) NOT NULL,
        \`externalAccountId\` VARCHAR(128) NOT NULL,
        \`accountType\` VARCHAR(64) NOT NULL,
        \`displayName\` VARCHAR(256) NOT NULL,
        \`metadata\` JSON NOT NULL,
        \`isSelected\` BOOLEAN NOT NULL DEFAULT false,
        \`healthSummary\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`MarketingAccount_connectionId_externalAccountId_key\`(\`connectionId\`, \`externalAccountId\`),
        INDEX \`MarketingAccount_accountType_idx\`(\`accountType\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`MarketingConnection\`
        ADD CONSTRAINT \`MarketingConnection_providerId_fkey\`
        FOREIGN KEY (\`providerId\`) REFERENCES \`MarketingProviderRuntime\`(\`providerId\`)
        ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {}
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`MarketingCredential\`
        ADD CONSTRAINT \`MarketingCredential_connectionId_fkey\`
        FOREIGN KEY (\`connectionId\`) REFERENCES \`MarketingConnection\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {}
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`MarketingAccount\`
        ADD CONSTRAINT \`MarketingAccount_connectionId_fkey\`
        FOREIGN KEY (\`connectionId\`) REFERENCES \`MarketingConnection\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE`);
    } catch {}
  } else {
    return;
  }

  schemaEnsured = true;
}

export async function ensureProviderRuntime(providerId: string) {
  const manifest = getProviderManifest(providerId);
  try {
    return await prisma.marketingProviderRuntime.upsert({
      where: { providerId },
      create: {
        providerId,
        enabled: true,
        installedVersion: manifest?.version.sdkVersion ?? "1.0.0",
        lifecycle: "discovered",
      },
      update: {},
    });
  } catch (error) {
    if (!isMissingMarketingTableError(error)) throw error;
    await ensureCoreMarketingSchema();
    return prisma.marketingProviderRuntime.upsert({
      where: { providerId },
      create: {
        providerId,
        enabled: true,
        installedVersion: manifest?.version.sdkVersion ?? "1.0.0",
        lifecycle: "discovered",
      },
      update: {},
    });
  }
}

export async function upsertConnectionFromOAuth(params: {
  providerId: string;
  tenantId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date | null;
  grantedScopes: string[];
  oauthMetadata?: Record<string, unknown>;
}) {
  await ensureProviderRuntime(params.providerId);
  const manifest = getProviderManifest(params.providerId);
  const required = manifest?.oauthConfig.scopes ?? [];
  const entries = buildPermissionEntries(required, params.grantedScopes);
  const summary = summarizePermissions(entries);
  const tenantId = params.tenantId ?? "default";

  const connection = await prisma.marketingConnection.upsert({
    where: {
      providerId_tenantId: {
        providerId: params.providerId,
        tenantId,
      },
    },
    create: {
      providerId: params.providerId,
      tenantId,
      status: "connected",
      lifecycle: "connected",
      oauthMetadata: asJson(params.oauthMetadata ?? {}),
      scopesGranted: asJson(params.grantedScopes),
      scopesRequired: asJson(required),
      scopesMissing: asJson(summary.missing),
      scopesExpired: asJson(summary.expired),
      lastHealthAt: new Date(),
    },
    update: {
      status: "connected",
      lifecycle: "connected",
      oauthMetadata: asJson(params.oauthMetadata ?? {}),
      scopesGranted: asJson(params.grantedScopes),
      scopesRequired: asJson(required),
      scopesMissing: asJson(summary.missing),
      scopesExpired: asJson(summary.expired),
      lastHealthAt: new Date(),
    },
  });

  await prisma.marketingCredential.upsert({
    where: { connectionId: connection.id },
    create: {
      connectionId: connection.id,
      accessToken: sealSecret(params.accessToken) ?? "",
      refreshToken: sealSecret(params.refreshToken) ?? null,
      expiresAt: params.expiresAt ?? null,
      refreshStatus: "ok",
    },
    update: {
      accessToken: sealSecret(params.accessToken) ?? "",
      refreshToken: sealSecret(params.refreshToken) ?? null,
      expiresAt: params.expiresAt ?? null,
      refreshStatus: "ok",
    },
  });

  await prisma.marketingPermissionState.upsert({
    where: {
      providerId_connectionId: {
        providerId: params.providerId,
        connectionId: connection.id,
      },
    },
    create: {
      providerId: params.providerId,
      connectionId: connection.id,
      entries: asJson(entries),
      lastCheckedAt: new Date(),
    },
    update: {
      entries: asJson(entries),
      lastCheckedAt: new Date(),
    },
  });

  await prisma.marketingProviderRuntime.update({
    where: { providerId: params.providerId },
    data: { lifecycle: "connected", lastSyncAt: new Date() },
  });

  return connection;
}

export async function getUnsealedAccessToken(connectionId: string) {
  const credential = await prisma.marketingCredential.findUnique({ where: { connectionId } });
  if (!credential) return undefined;
  return unsealSecret(credential.accessToken);
}

export async function transitionConnectionLifecycle(
  connectionId: string,
  to: ProviderLifecycleState,
) {
  const connection = await prisma.marketingConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });
  assertLifecycleTransition(connection.lifecycle as ProviderLifecycleState, to);
  return prisma.marketingConnection.update({
    where: { id: connectionId },
    data: { lifecycle: to, status: to === "disconnected" ? "disconnected" : connection.status },
  });
}

export async function syncAccountsForConnection(
  connectionId: string,
  accounts: Array<{
    externalId: string;
    name: string;
    type: string;
    metadata?: Record<string, unknown>;
  }>,
) {
  const results = [];
  for (const account of accounts) {
    const row = await prisma.marketingAccount.upsert({
      where: {
        connectionId_externalAccountId: {
          connectionId,
          externalAccountId: account.externalId,
        },
      },
      create: {
        connectionId,
        externalAccountId: account.externalId,
        accountType: account.type,
        displayName: account.name,
        metadata: asJson(account.metadata ?? {}),
      },
      update: {
        accountType: account.type,
        displayName: account.name,
        metadata: asJson(account.metadata ?? {}),
      },
    });
    results.push(row);
  }
  return results;
}
