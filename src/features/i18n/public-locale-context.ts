import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import {
  getBundleTranslations,
  loadPageTranslationBundle,
  type TranslationBundle,
} from "@/features/translation/translation-bundle";
import type { BlockParentType } from "@/features/translation/block-translation";
import type { PageBlocks } from "@/types/builder";
import {
  resolveTranslation,
  type TranslationContext,
} from "@/features/translation/translation-resolver";
import { getLocalizedField, type LocalizedFieldOptions } from "@/lib/utils";

export type PublicLocaleContext = {
  urlPrefix: string;
  languageCode: string;
  enabledLocales: PublicLocale[];
  defaultCode: string;
};

/**
 * Load enabled locales and resolve the active language code from a URL prefix.
 */
export async function loadPublicLocaleContext(urlPrefix: string): Promise<PublicLocaleContext> {
  const enabledLocales = await localeService.listEnabled();
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code ?? "en";
  const languageCode = resolvePrefixToCode(urlPrefix, enabledLocales);
  return { urlPrefix, languageCode, enabledLocales, defaultCode };
}

export function toTranslationContext(
  ctx: PublicLocaleContext,
  extras?: Pick<TranslationContext, "translations" | "legacyEntity">
): TranslationContext {
  return {
    enabledLocales: ctx.enabledLocales,
    defaultCode: ctx.defaultCode,
    translations: extras?.translations,
    legacyEntity: extras?.legacyEntity,
  };
}

/**
 * Resolve a field for the active locale, then fall back to English explicitly.
 */
export function resolveWithEnglishFallback(
  field: string,
  ctx: PublicLocaleContext,
  options?: Pick<TranslationContext, "translations" | "legacyEntity">
): string {
  const base = toTranslationContext(ctx, options);
  const value = resolveTranslation(field, ctx.languageCode, base);
  if (value.trim()) return value;
  if (ctx.languageCode.toLowerCase() === "en") return value;
  return resolveTranslation(field, "en", base);
}

export function createLocalizedGetter(
  ctx: PublicLocaleContext,
  translations?: EntityTranslation[]
) {
  const options: LocalizedFieldOptions = {
    enabledLocales: ctx.enabledLocales,
    defaultCode: ctx.defaultCode,
    translations,
  };

  return function localized<T extends Record<string, unknown>>(
    entity: T,
    field: string,
    entityTranslations?: EntityTranslation[]
  ): string {
    return getLocalizedField(entity, field, ctx.urlPrefix, {
      ...options,
      translations: entityTranslations ?? translations,
    });
  };
}

export async function loadEntityTranslations(
  entityType: string,
  entityId: string
): Promise<EntityTranslation[]> {
  return translationService.getForEntity(entityType, entityId);
}

export async function loadEntityTranslationsMap(
  entityType: string,
  entityIds: string[]
): Promise<Map<string, EntityTranslation[]>> {
  return translationService.getForEntities(entityType, entityIds);
}

export async function loadPageTranslations(
  parentType: BlockParentType,
  parentId: string,
  blocks?: PageBlocks
): Promise<{ bundle: TranslationBundle; translations: EntityTranslation[] }> {
  const bundle = await loadPageTranslationBundle(parentType, parentId, blocks);
  return {
    bundle,
    translations: getBundleTranslations(bundle, parentType, parentId),
  };
}
