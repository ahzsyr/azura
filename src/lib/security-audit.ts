import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function writeSecurityAuditLog(input: {
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  ip?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.securityAuditLog.create({
      data: {
        id: `sal_${randomBytes(12).toString("hex")}`,
        action: input.action.slice(0, 64),
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        ip: input.ip?.slice(0, 64) ?? null,
        meta: (input.meta ?? {}) as object,
      },
    });
  } catch (error) {
    console.warn("[security-audit] write failed:", error);
  }
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
