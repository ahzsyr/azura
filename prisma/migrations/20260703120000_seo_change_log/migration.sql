import { prisma } from "@/lib/prisma";

/**
 * SQL migration for SeoChangeLog — run when deploying.
 * Prisma model: SeoChangeLog in platform.prisma
 */
export const SEO_CHANGE_LOG_MIGRATION = `
CREATE TABLE IF NOT EXISTS "SeoChangeLog" (
  "id" TEXT NOT NULL,
  "correlationId" VARCHAR(64) NOT NULL,
  "origin" VARCHAR(32) NOT NULL,
  "entityKind" VARCHAR(32) NOT NULL,
  "entityId" VARCHAR(128) NOT NULL,
  "pageKey" VARCHAR(128),
  "localeCode" VARCHAR(8) NOT NULL,
  "profileId" VARCHAR(64),
  "applyMode" VARCHAR(32),
  "userId" VARCHAR(64),
  "field" VARCHAR(64) NOT NULL,
  "previousValue" TEXT,
  "newValue" TEXT,
  "action" VARCHAR(16) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeoChangeLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SeoChangeLog_correlationId_idx" ON "SeoChangeLog"("correlationId");
CREATE INDEX IF NOT EXISTS "SeoChangeLog_origin_idx" ON "SeoChangeLog"("origin");
CREATE INDEX IF NOT EXISTS "SeoChangeLog_entityKind_entityId_idx" ON "SeoChangeLog"("entityKind", "entityId");
CREATE INDEX IF NOT EXISTS "SeoChangeLog_createdAt_idx" ON "SeoChangeLog"("createdAt");
`;

/** Best-effort check — table may not exist until migration runs. */
export async function isSeoChangeLogAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "SeoChangeLog" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}
