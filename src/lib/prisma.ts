/**
 * Singleton Prisma client (dev hot-reload safe).
 * Use repositories for complex queries; import `prisma` only in thin services/actions.
 */
import { PrismaClient } from "@prisma/client";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaClientVersion?: number;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

/** Models added after initial dev-server boot require a fresh client instance. */
const REQUIRED_DELEGATES = ["testimonialCollection", "testimonialCollectionItem"] as const;

/**
 * Bump after `prisma generate` when models/fields change so dev hot-reload
 * recreates a cached client (e.g. SiteTheme.brandConfig).
 */
const PRISMA_CLIENT_VERSION = 2;

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isStalePrismaClient(client: PrismaClient): boolean {
  if (REQUIRED_DELEGATES.some((key) => !(key in client))) {
    return true;
  }

  return globalForPrisma.prismaClientVersion !== PRISMA_CLIENT_VERSION;
}

function getPrismaClient(): PrismaClient {
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
