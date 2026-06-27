import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const siteSettingsRepository = {
  async get(locale: string): Promise<Record<string, unknown> | null> {
    const row = await prisma.siteSettings.findUnique({
      where: { locale: locale.toLowerCase() },
    });
    if (!row?.payload || typeof row.payload !== "object") return null;
    return row.payload as Record<string, unknown>;
  },

  async set(locale: string, payload: Record<string, unknown>): Promise<void> {
    const loc = locale.toLowerCase();
    await prisma.siteSettings.upsert({
      where: { locale: loc },
      create: {
        locale: loc,
        payload: payload as Prisma.InputJsonValue,
      },
      update: {
        payload: payload as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
  },

  async markPublished(locale: string): Promise<void> {
    const loc = locale.toLowerCase();
    const row = await prisma.siteSettings.findUnique({ where: { locale: loc } });
    if (!row) return;
    await prisma.siteSettings.update({
      where: { locale: loc },
      data: { publishedVersion: row.version } as Prisma.SiteSettingsUpdateInput,
    });
  },

  async getPublishStatus(locale: string): Promise<{
    version: number;
    publishedVersion: number;
    isLive: boolean;
  } | null> {
    const row = await prisma.siteSettings.findUnique({
      where: { locale: locale.toLowerCase() },
      select: { version: true, publishedVersion: true } as Prisma.SiteSettingsSelect,
    });
    if (!row) return null;
    const status = row as { version: number; publishedVersion: number };
    return {
      version: status.version,
      publishedVersion: status.publishedVersion,
      isLive: status.version === status.publishedVersion,
    };
  },

  async patch(locale: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    const existing = (await this.get(locale)) ?? {};
    const next = { ...existing, ...patch };
    await this.set(locale, next);
    return next;
  },
};
