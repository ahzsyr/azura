import type { Prisma } from "@prisma/client";
import { resolvePresetTheme } from "@/features/theme/preset-resolver";
import type { DemoThemeConfig } from "./types";

type ThemeClient = {
  siteTheme: {
    upsert: (args: {
      where: { id: string };
      update: Prisma.SiteThemeUpdateInput;
      create: Prisma.SiteThemeCreateInput;
    }) => Promise<unknown>;
  };
};

export async function applyDemoTheme(
  tx: ThemeClient,
  theme: DemoThemeConfig
): Promise<void> {
  const resolved = await resolvePresetTheme(theme.presetId);
  if (!resolved) {
    throw new Error(`Preset "${theme.presetId}" not found`);
  }

  const typography = resolved.fonts
    ? {
        bodyFont: resolved.fonts.body,
        headingFont: resolved.fonts.display,
        baseFontSize: "16px",
        headingScale: 1.25,
      }
    : {
        bodyFont: "Plus Jakarta Sans",
        headingFont: "Amiri",
        baseFontSize: "16px",
        headingScale: 1.25,
      };

  const themeData = {
    preset: "CUSTOM" as const,
    activePresetId: resolved.activePresetId,
    primaryColor: resolved.primaryColor,
    secondaryColor: resolved.secondaryColor,
    cursorEffect: resolved.cursorEffect,
    backgroundEffect: resolved.backgroundEffect,
    textEffect: resolved.textEffect,
    cardStyle: resolved.cardStyle,
    borderStyle: resolved.borderStyle,
    typography,
    brandConfig: theme.brandConfig as Prisma.InputJsonValue,
    headerConfig: theme.headerConfig as Prisma.InputJsonValue,
    footerConfig: theme.footerConfig as Prisma.InputJsonValue,
    animationsEnabled: true,
    animationSpeed: 1,
    lazyLoadEnabled: true,
    darkModeEnabled: true,
    spacingScale: 1,
    customCss: null,
  };

  for (const id of ["published", "draft"]) {
    await tx.siteTheme.upsert({
      where: { id },
      update: themeData,
      create: { id, ...themeData },
    });
  }
}
