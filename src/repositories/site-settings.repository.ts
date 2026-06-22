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

  async patch(locale: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    const existing = (await this.get(locale)) ?? {};
    const next = { ...existing, ...patch };
    await this.set(locale, next);
    return next;
  },
};
