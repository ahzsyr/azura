import type { TranslationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidateTranslations } from "@/services/cache";

export type FieldVersionSnapshot = {
  translationId: string;
  value: string;
  status: TranslationStatus;
  changedBy?: string | null;
};

export const versioningService = {
  async onFieldWrite(snapshot: FieldVersionSnapshot) {
    return prisma.entityTranslationVersion.create({
      data: {
        translationId: snapshot.translationId,
        value: snapshot.value,
        status: snapshot.status,
        changedBy: snapshot.changedBy ?? null,
      },
    });
  },

  async listVersions(translationId: string) {
    return prisma.entityTranslationVersion.findMany({
      where: { translationId },
      orderBy: { createdAt: "desc" },
    });
  },

  async listVersionsForField(entityType: string, entityId: string, field: string) {
    return prisma.entityTranslationVersion.findMany({
      where: {
        translation: {
          entityType,
          entityId,
          field,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async restoreVersion(translationId: string, versionId: string) {
    const version = await prisma.entityTranslationVersion.findFirst({
      where: { id: versionId, translationId },
    });
    if (!version) throw new Error("Version not found");

    const current = await prisma.entityTranslation.findUnique({ where: { id: translationId } });
    if (!current) throw new Error("Translation not found");

    if (current.value !== version.value) {
      await this.onFieldWrite({
        translationId,
        value: current.value,
        status: current.status,
      });
    }

    const row = await prisma.entityTranslation.update({
      where: { id: translationId },
      data: {
        value: version.value,
        status: version.status,
        version: { increment: 1 },
      },
    });

    revalidateTranslations(row.entityType, row.entityId);
    return row;
  },
};
