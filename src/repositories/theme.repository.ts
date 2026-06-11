import { prisma } from "@/lib/prisma";
import type { Prisma, SiteTheme } from "@prisma/client";

export const themeRepository = {
  getPublished(): Promise<SiteTheme | null> {
    return prisma.siteTheme.findUnique({ where: { id: "published" } });
  },

  getDraft(): Promise<SiteTheme | null> {
    return prisma.siteTheme.findUnique({ where: { id: "draft" } });
  },

  async upsertDraft(data: Prisma.SiteThemeCreateInput) {
    const { id: _id, ...rest } = data;
    return prisma.siteTheme.upsert({
      where: { id: "draft" },
      create: { id: "draft", ...rest },
      update: rest,
    });
  },

  async publishFromDraft() {
    const draft = await prisma.siteTheme.findUnique({ where: { id: "draft" } });
    if (!draft) throw new Error("No draft theme");
    const data: Prisma.SiteThemeCreateInput = {
      id: "published",
      preset: draft.preset,
      activePresetId: draft.activePresetId,
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      typography: draft.typography as Prisma.InputJsonValue,
      faviconUrl: draft.faviconUrl,
      logoUrl: draft.logoUrl,
      brandConfig: (draft.brandConfig ?? {}) as Prisma.InputJsonValue,
      headerConfig: draft.headerConfig as Prisma.InputJsonValue,
      footerConfig: draft.footerConfig as Prisma.InputJsonValue,
      animationsEnabled: draft.animationsEnabled,
      animationSpeed: draft.animationSpeed,
      lazyLoadEnabled: draft.lazyLoadEnabled,
      darkModeEnabled: draft.darkModeEnabled,
      spacingScale: draft.spacingScale,
      customCss: draft.customCss,
      cursorEffect: draft.cursorEffect,
      backgroundEffect: draft.backgroundEffect,
      textEffect: draft.textEffect,
      cursorEffectEnabled: draft.cursorEffectEnabled,
      backgroundEffectEnabled: draft.backgroundEffectEnabled,
      textEffectEnabled: draft.textEffectEnabled,
      backgroundEffectSettings: (draft.backgroundEffectSettings ?? {}) as Prisma.InputJsonValue,
      cardStyle: draft.cardStyle,
      borderStyle: draft.borderStyle,
    };
    const { id: _id, ...updateData } = data;
    return prisma.siteTheme.upsert({
      where: { id: "published" },
      create: data,
      update: updateData,
    });
  },
};
