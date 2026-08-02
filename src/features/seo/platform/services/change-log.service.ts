import "server-only";

import { prisma } from "@/lib/prisma";
import type { SeoChangeSet } from "../types/change-set";

export async function logChangeSet(changeSet: SeoChangeSet, userId?: string): Promise<void> {
  const pageKey = changeSet.writeTarget.pageKey ?? null;
  const rows = changeSet.fields
    .filter((f) => f.action === "apply")
    .map((field) => ({
      correlationId: changeSet.correlationId,
      origin: changeSet.origin,
      entityKind: changeSet.descriptor.kind,
      entityId: changeSet.descriptor.id,
      pageKey,
      localeCode: field.localeCode ?? changeSet.locale,
      profileId: changeSet.profileId,
      applyMode: changeSet.applyMode,
      userId: userId ?? null,
      field: field.field,
      previousValue: field.previous,
      newValue: field.next,
      action: field.action,
    }));

  if (!rows.length) return;

  try {
    await prisma.seoChangeLog.createMany({ data: rows });
  } catch (error) {
    console.error("[seoChangeLog] failed to persist:", error);
  }
}

export async function listRecentChangeLogs(limit = 50) {
  try {
    return await prisma.seoChangeLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}
