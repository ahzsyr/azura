import type { BlockLocalizationSettings, BlockStyleSettings } from "@/types/block-system";
import type { BlockNode } from "@/types/builder";
import { getBlockSettings } from "@/features/builder/instance/block-instance";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type { PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import { getContentFieldSuffix } from "@/i18n/locale-config";

export function getLocaleStyleOverride(
  block: BlockNode,
  locale: string
): BlockStyleSettings | undefined {
  return block.localization?.localeStyles?.[locale];
}

export function getLocaleVisibilityOverride(block: BlockNode, locale: string) {
  return block.localization?.localeVisibility?.[locale];
}

/** Resolve a translatable field with instance localization + EntityTranslation + legacy props */
export function resolveBlockField(
  block: BlockNode,
  field: string,
  locale: string,
  options: {
    enabledLocales?: PublicLocale[];
    entityTranslations?: EntityTranslation[];
    fallbackChain?: string[];
  } = {}
): string {
  const settings = getBlockSettings(block);
  const chain = options.fallbackChain ?? block.localization?.fallbackChain ?? [locale, "en"];

  const instanceTranslations = block.localization?.translations?.[field];
  if (instanceTranslations) {
    for (const code of chain) {
      const v = instanceTranslations[code];
      if (v) return v;
    }
  }

  return resolveTranslation(field, locale, {
    translations: options.entityTranslations,
    legacyEntity: settings,
    enabledLocales: options.enabledLocales,
  });
}

/** Build legacy *En/*Ar props from instance translations for editor compatibility */
export function syncLegacyPropsFromLocalization(
  block: BlockNode,
  locales: PublicLocale[]
): Record<string, unknown> {
  const settings = { ...getBlockSettings(block) };
  const translations = block.localization?.translations ?? {};

  for (const [field, byLocale] of Object.entries(translations)) {
    for (const loc of locales) {
      const value = byLocale[loc.code];
      if (!value) continue;
      const suffix = getContentFieldSuffix(loc.code);
      settings[`${field}${suffix}`] = value;
    }
  }

  return settings;
}

export function setInstanceTranslation(
  localization: BlockLocalizationSettings | undefined,
  field: string,
  locale: string,
  value: string
): BlockLocalizationSettings {
  const next = { ...localization };
  const translations = { ...next.translations };
  const fieldMap = { ...(translations[field] ?? {}), [locale]: value };
  translations[field] = fieldMap;
  next.translations = translations;
  return next;
}
