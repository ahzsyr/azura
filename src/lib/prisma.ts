/**
 * Singleton Prisma client (dev hot-reload safe).
 * Use repositories for complex queries; import `prisma` only in thin services/actions.
 */
import "server-only";

import { PrismaClient } from "@prisma/client";
import { getRuntimeDatabaseUrl } from "@/lib/database-url";
import { isBuildWithoutDb } from "@/lib/build-db";
import { createBuildStubPrismaClient } from "@/lib/build-prisma-stub";
import {
  missingScalarColumnsFromPrismaError,
  withoutScalarColumns,
} from "@/lib/prisma-editorial-column-compat";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaClientVersion?: number;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

/** Models added after initial dev-server boot require a fresh client instance. */
const REQUIRED_DELEGATES = [
  "testimonialCollection",
  "testimonialCollectionItem",
  "interactionEvent",
  "formBehaviorEvent",
  "formTemplateSnapshot",
  "marketingProviderAppConfig",
] as const;

/**
 * Bump after `prisma generate` when models/fields change so dev hot-reload
 * recreates a cached client (e.g. SiteTheme.brandConfig).
 */
const PRISMA_CLIENT_VERSION = 8;

function normalizeRuntimeDatabaseUrl(url: string): string {
  return getRuntimeDatabaseUrl() || url;
}

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL?.trim() ?? "";
  const datasourceUrl = normalizeRuntimeDatabaseUrl(rawUrl);
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, operation }) {
          let current = args as Record<string, unknown>;
          let lastError: unknown;
          for (let attempt = 0; attempt < 8; attempt++) {
            try {
              return await query(current);
            } catch (error) {
              lastError = error;
              if (String(operation).startsWith("$")) throw error;
              const columns = missingScalarColumnsFromPrismaError(error);
              if (columns.length === 0) throw error;
              current = withoutScalarColumns(current, columns);
            }
          }
          throw lastError;
        },
      },
    },
  }) as unknown as PrismaClient;
}

function isStalePrismaClient(client: PrismaClient): boolean {
  if (REQUIRED_DELEGATES.some((key) => !(key in client))) {
    return true;
  }

  return globalForPrisma.prismaClientVersion !== PRISMA_CLIENT_VERSION;
}

function getPrismaClient(): PrismaClient {
  if (isBuildWithoutDb()) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createBuildStubPrismaClient();
    }
    return globalForPrisma.prisma;
  }

  const cached = globalForPrisma.prisma;
  if (cached && isStalePrismaClient(cached)) {
    void cached.$disconnect();
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaClientVersion = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaClientVersion = PRISMA_CLIENT_VERSION;
  }

  return globalForPrisma.prisma;
}

/**
 * Always resolves the current singleton (recreates after `prisma generate` in dev).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = getPrismaClient();
}
