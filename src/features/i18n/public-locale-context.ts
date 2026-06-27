import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { translationService } from "@/features/translation/translation.service";
import { resolveActiveLocale } from "@/i18n/resolve-active-locale";
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
  const resolved = await resolveActiveLocale(urlPrefix);
  return {
    urlPrefix: resolved.urlPrefix,
    languageCode: resolved.languageCode,
    enabledLocales: resolved.enabledLocales,
    defaultCode: resolved.defaultCode,
  };
}

export function toTranslationContext(
  ctx: PublicLocaleContext,
  extras?: Pick<TranslationContext, "translations">
): TranslationContext {
  return {
    enabledLocales: ctx.enabledLocales,
    defaultCode: ctx.defaultCode,
    translations: extras?.translations,
  };
}

/**
 * Resolve a field for the active locale, then fall back to English explicitly.
 */
export function resolveWithEnglishFallback(
  field: string,
  ctx: PublicLocaleContext,
  options?: Pick<TranslationContext, "translations">
): string {
  const base = toTranslationContext(ctx, options);
  const value = resolveTranslation(field, ctx.languageCode, base);
  if (value.trim()) return value;
  if (ctx.languageCode.toLowerCase() === ctx.defaultCode.toLowerCase()) return value;
  return resolveTranslation(field, ctx.defaultCode, base);
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
