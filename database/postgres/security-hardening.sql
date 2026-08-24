-- PostgreSQL companion for security hardening (applied via prisma-migrate-deploy patches on Postgres hosts).
-- Hostinger MySQL uses prisma/migrations/20260821120000_security_hardening/migration.sql instead.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'GATED', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "visibility" "MediaVisibility" NOT NULL DEFAULT 'PUBLIC';

CREATE TABLE IF NOT EXISTS "MfaRecoveryCode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "codeHash" VARCHAR(64) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode"("userId");

CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  "id" TEXT PRIMARY KEY,
  "bucketKey" VARCHAR(191) NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "RateLimitBucket_bucketKey_key" ON "RateLimitBucket"("bucketKey");
CREATE INDEX IF NOT EXISTS "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

CREATE TABLE IF NOT EXISTS "SecurityAuditLog" (
  "id" TEXT PRIMARY KEY,
  "action" VARCHAR(64) NOT NULL,
  "actorId" VARCHAR(36),
  "actorRole" VARCHAR(32),
  "ip" VARCHAR(64),
  "meta" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SecurityAuditLog_action_createdAt_idx" ON "SecurityAuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityAuditLog_actorId_createdAt_idx" ON "SecurityAuditLog"("actorId", "createdAt");

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
