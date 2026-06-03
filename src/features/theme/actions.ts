"use server";

import { requireAdmin } from "@/features/auth/guards";
import { themeService } from "./theme.service";
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import { siteThemeSchema } from "@/schemas/theme";
import { revalidateTheme } from "@/services/cache";
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_TYPOGRAPHY,
  parseBrandConfig,
} from "./theme-config";
import { cookies } from "next/headers";

function parseJsonField<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (!raw || typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveThemeDraft(formData: FormData) {
  await requireAdmin();

  const raw = {
    preset: formData.get("preset") ?? "CLASSIC",
    primaryColor: formData.get("primaryColor") ?? "#047857",
    secondaryColor: formData.get("secondaryColor") ?? "#d4af37",
    typography: parseJsonField(formData.get("typography"), DEFAULT_TYPOGRAPHY),
    faviconUrl: (formData.get("faviconUrl") as string) || null,
    logoUrl: (formData.get("logoUrl") as string) || null,
    brandConfig: parseJsonField(formData.get("brandConfig"), {}),
    headerConfig: parseJsonField(formData.get("headerConfig"), DEFAULT_HEADER_CONFIG),
    footerConfig: parseJsonField(formData.get("footerConfig"), DEFAULT_FOOTER_CONFIG),
    animationsEnabled: formData.get("animationsEnabled") === "true",
    animationSpeed: Number(formData.get("animationSpeed") ?? 1),
    lazyLoadEnabled: formData.get("lazyLoadEnabled") === "true",
    darkModeEnabled: formData.get("darkModeEnabled") === "true",
    spacingScale: Number(formData.get("spacingScale") ?? 1),
    customCss: (formData.get("customCss") as string) || null,
    activePresetId: (formData.get("activePresetId") as string) || null,
    cursorEffect: (formData.get("cursorEffect") as string) || null,
    backgroundEffect: (formData.get("backgroundEffect") as string) || null,
    textEffect: (formData.get("textEffect") as string) || null,
    cursorEffectEnabled: formData.get("cursorEffectEnabled") === "true",
    backgroundEffectEnabled: formData.get("backgroundEffectEnabled") === "true",
    textEffectEnabled: formData.get("textEffectEnabled") === "true",
    cardStyle: (formData.get("cardStyle") as string) || null,
    borderStyle: (formData.get("borderStyle") as string) || null,
  };

  const parsed = siteThemeSchema.parse(raw);

  await themeService.saveDraft({
    id: "draft",
    preset: parsed.preset,
    primaryColor: parsed.primaryColor,
    secondaryColor: parsed.secondaryColor,
    typography: parsed.typography ?? DEFAULT_TYPOGRAPHY,
    faviconUrl: parsed.faviconUrl ?? null,
    logoUrl: parsed.logoUrl ?? null,
    brandConfig: normalizeBranding(parsed.brandConfig as Record<string, unknown>) as object,
    headerConfig: parsed.headerConfig ?? DEFAULT_HEADER_CONFIG,
    footerConfig: parsed.footerConfig ?? DEFAULT_FOOTER_CONFIG,
    animationsEnabled: parsed.animationsEnabled,
    animationSpeed: parsed.animationSpeed,
    lazyLoadEnabled: parsed.lazyLoadEnabled,
    darkModeEnabled: parsed.darkModeEnabled,
    spacingScale: parsed.spacingScale,
    customCss: parsed.customCss ?? null,
    activePresetId: parsed.activePresetId ?? null,
    cursorEffect: parsed.cursorEffect ?? null,
    backgroundEffect: parsed.backgroundEffect ?? null,
    textEffect: parsed.textEffect ?? null,
    cursorEffectEnabled: parsed.cursorEffectEnabled,
    backgroundEffectEnabled: parsed.backgroundEffectEnabled,
    textEffectEnabled: parsed.textEffectEnabled,
    cardStyle: parsed.cardStyle ?? null,
    borderStyle: parsed.borderStyle ?? null,
  });

  return { ok: true as const };
}

export async function publishTheme() {
  await requireAdmin();
  await themeService.publish();
  revalidateTheme();
  return { ok: true as const };
}

export async function clearThemePreview() {
  const cookieStore = await cookies();
  cookieStore.delete("theme-preview");
}
