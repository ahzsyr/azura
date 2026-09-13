"use server";

import { requireAdmin } from "@/features/auth/guards";
import { themeService } from "./theme.service";
import { normalizeBranding } from "@/features/navigation/branding-defaults";
import { parseBackgroundEffectSettings } from "@/features/theme/backgrounds/settings";
import {
  parseMotionSettings,
  parseVisualEffectSettings,
} from "@/features/theme/effect-settings";
import { siteThemeSchema } from "@/schemas/theme";
import { publishShellChange } from "@/services/publish-propagation";
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_TYPOGRAPHY,
  parseBrandConfig,
} from "./theme-config";
import { cookies } from "next/headers";
import { applyPatch, isEmptyPatch } from "@/lib/patch";
import { themeRepository } from "@/repositories/theme.repository";
import { siteThemeToTokens } from "./theme-config";
import type { ThemeTokens } from "@/types/theme";
import { syncPresetIdentityFields, canonicalSiteDefaultPresetId } from "./preset-identity";

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
    siteDefaultPresetId: canonicalSiteDefaultPresetId(
      (formData.get("siteDefaultPresetId") as string) || null,
    ),
    cursorEffect: (formData.get("cursorEffect") as string) || null,
    backgroundEffect: (formData.get("backgroundEffect") as string) || null,
    textEffect: (formData.get("textEffect") as string) || null,
    cursorEffectEnabled: formData.get("cursorEffectEnabled") === "true",
    backgroundEffectEnabled: formData.get("backgroundEffectEnabled") === "true",
    textEffectEnabled: formData.get("textEffectEnabled") === "true",
    cardStyle: (formData.get("cardStyle") as string) || null,
    borderStyle: (formData.get("borderStyle") as string) || null,
    themeProvenance: parseJsonField(formData.get("themeProvenance"), null),
    mobileBrowserConfig: parseJsonField(formData.get("mobileBrowserConfig"), {}),
    backgroundEffectSettings: parseBackgroundEffectSettings(
      parseJsonField(formData.get("backgroundEffectSettings"), {}),
    ),
    cursorEffectSettings: parseVisualEffectSettings(
      parseJsonField(formData.get("cursorEffectSettings"), {}),
    ),
    textEffectSettings: parseVisualEffectSettings(
      parseJsonField(formData.get("textEffectSettings"), {}),
    ),
    motionSettings: parseMotionSettings(parseJsonField(formData.get("motionSettings"), {})),
  };

  const parsed = siteThemeSchema.parse(raw);
  const presetIdentity = syncPresetIdentityFields(parsed.siteDefaultPresetId);

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
    siteDefaultPresetId: presetIdentity.siteDefaultPresetId,
    activePresetId: presetIdentity.activePresetId,
    cursorEffect: parsed.cursorEffect ?? null,
    backgroundEffect: parsed.backgroundEffect ?? null,
    textEffect: parsed.textEffect ?? null,
    cursorEffectEnabled: parsed.cursorEffectEnabled,
    backgroundEffectEnabled: parsed.backgroundEffectEnabled,
    textEffectEnabled: parsed.textEffectEnabled,
    cardStyle: parsed.cardStyle ?? null,
    borderStyle: parsed.borderStyle ?? null,
    backgroundEffectSettings: parsed.backgroundEffectSettings ?? { intensity: 1, opacity: 1 },
    cursorEffectSettings: parsed.cursorEffectSettings ?? { intensity: 1, opacity: 1 },
    textEffectSettings: parsed.textEffectSettings ?? { intensity: 1, opacity: 1 },
    motionSettings: parsed.motionSettings ?? { intensity: 1, opacity: 1 },
    themeProvenance:
      (parsed.themeProvenance as object | null | undefined) ??
      ({ sourcePresetId: null, appliedAt: null } as object),
    mobileBrowserConfig: (parsed.mobileBrowserConfig ?? {
      syncWithTheme: true,
      browserThemeColorLight: null,
      browserThemeColorDark: null,
      browserBackgroundColor: null,
      iosStatusBarStyle: "default",
    }) as object,
  });

  return { ok: true as const };
}

export async function saveThemeDraftPatch(changes: Record<string, unknown>) {
  await requireAdmin();

  if (isEmptyPatch(changes)) {
    return { ok: true as const, noop: true as const };
  }

  const draft = await themeRepository.getDraft();
  const published = await themeRepository.getPublished();
  const baseRecord = draft ?? published;
  if (!baseRecord) throw new Error("No theme configured");

  const baseline = siteThemeToTokens(baseRecord) as Record<string, unknown>;
  const merged = applyPatch(baseline, changes) as ThemeTokens;
  const presetIdentity = syncPresetIdentityFields(merged.siteDefaultPresetId);
  const fd = new FormData();
  fd.set("preset", merged.preset);
  fd.set("primaryColor", merged.primaryColor);
  fd.set("secondaryColor", merged.secondaryColor);
  fd.set("typography", JSON.stringify(merged.typography));
  fd.set("faviconUrl", merged.faviconUrl ?? "");
  fd.set("logoUrl", merged.logoUrl ?? "");
  fd.set("brandConfig", JSON.stringify(merged.brandConfig));
  fd.set("headerConfig", JSON.stringify(merged.headerConfig));
  fd.set("footerConfig", JSON.stringify(merged.footerConfig));
  fd.set("animationsEnabled", merged.animationsEnabled ? "true" : "false");
  fd.set("animationSpeed", String(merged.animationSpeed));
  fd.set("lazyLoadEnabled", merged.lazyLoadEnabled ? "true" : "false");
  fd.set("darkModeEnabled", merged.darkModeEnabled ? "true" : "false");
  fd.set("spacingScale", String(merged.spacingScale));
  fd.set("customCss", merged.customCss ?? "");
  fd.set("siteDefaultPresetId", presetIdentity.siteDefaultPresetId ?? "");
  fd.set("cursorEffect", merged.cursorEffect ?? "");
  fd.set("backgroundEffect", merged.backgroundEffect ?? "");
  fd.set("textEffect", merged.textEffect ?? "");
  fd.set("cursorEffectEnabled", merged.cursorEffectEnabled ? "true" : "false");
  fd.set("backgroundEffectEnabled", merged.backgroundEffectEnabled ? "true" : "false");
  fd.set("textEffectEnabled", merged.textEffectEnabled ? "true" : "false");
  fd.set("cardStyle", merged.cardStyle ?? "");
  fd.set("borderStyle", merged.borderStyle ?? "");
  fd.set("backgroundEffectSettings", JSON.stringify(merged.backgroundEffectSettings ?? {}));
  fd.set("cursorEffectSettings", JSON.stringify(merged.cursorEffectSettings ?? {}));
  fd.set("textEffectSettings", JSON.stringify(merged.textEffectSettings ?? {}));
  fd.set("motionSettings", JSON.stringify(merged.motionSettings ?? {}));
  fd.set("themeProvenance", JSON.stringify(merged.themeProvenance ?? null));
  fd.set("mobileBrowserConfig", JSON.stringify(merged.mobileBrowserConfig ?? {}));
  await saveThemeDraft(fd);

  return { ok: true as const, appliedPaths: Object.keys(changes) };
}

export async function publishTheme() {
  await requireAdmin();
  await themeService.publish();
  const cookieStore = await cookies();
  cookieStore.delete("theme-preview");
  cookieStore.set("theme-reset", "1", {
    maxAge: 120,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });
  await publishShellChange({ entityType: "theme" });
  return { ok: true as const };
}

export async function clearThemePreview() {
  const cookieStore = await cookies();
  cookieStore.delete("theme-preview");
}
