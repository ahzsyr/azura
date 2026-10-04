import type { TranslationStatus } from "@prisma/client";

/** Immutable snapshot row stored on Revision.translations Json. */
export type RevisionTranslationSnapshotItem = {
  entityType: string;
  entityId: string;
  field: string;
  localeCode: string;
  value: string;
  status: TranslationStatus | string;
};

export function parseRevisionTranslationSnapshot(
  value: unknown,
): RevisionTranslationSnapshotItem[] {
  if (!Array.isArray(value)) return [];
  const out: RevisionTranslationSnapshotItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (
      typeof row.entityType !== "string" ||
      typeof row.entityId !== "string" ||
      typeof row.field !== "string" ||
      typeof row.localeCode !== "string" ||
      typeof row.value !== "string"
    ) {
      continue;
    }
    out.push({
      entityType: row.entityType,
      entityId: row.entityId,
      field: row.field,
      localeCode: row.localeCode,
      value: row.value,
      status: typeof row.status === "string" ? row.status : "PUBLISHED",
    });
  }
  return out;
}

/** Read edit-context locale from a stored revision composition envelope. */
export function getRevisionEditLocale(composition: unknown): string | null {
  if (!composition || typeof composition !== "object") return null;
  const meta = (composition as { meta?: { locale?: unknown } }).meta;
  if (typeof meta?.locale === "string" && meta.locale.trim()) return meta.locale.trim();
  return null;
}

/** Pure helper for SEO lifecycle tests — compare published vs working snapshot fields. */
export function pickSeoTitleFromRevisionSnapshots(params: {
  publishedSnapshot: RevisionTranslationSnapshotItem[];
  workingSnapshot: RevisionTranslationSnapshotItem[];
  field?: string;
  localeCode?: string;
}): { publicValue: string | null; workingValue: string | null } {
  const field = params.field ?? "metaTitle";
  const locale = (params.localeCode ?? "en").toLowerCase();
  const pick = (rows: RevisionTranslationSnapshotItem[]) => {
    const hit = rows.find(
      (row) =>
        row.entityType === "SeoMeta" &&
        row.field === field &&
        row.localeCode.toLowerCase() === locale &&
        row.value.trim(),
    );
    return hit?.value ?? null;
  };
  return {
    publicValue: pick(params.publishedSnapshot),
    workingValue: pick(params.workingSnapshot),
  };
}
