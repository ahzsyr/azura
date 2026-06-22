import type { EntityTranslation } from "@prisma/client";
import type { EntityRecord } from "@/features/entities/types";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import type { KnowledgeArticleCardViewModel } from "@/view-models/knowledge-article-card";
import type { KnowledgeArticleDetailViewModel } from "@/view-models/knowledge-article-detail";
import type { ResolverContext } from "@/view-models/types";
import {
  resolveKnowledgeArticleCardTemplateId,
  resolveKnowledgeArticleDetailTemplateId,
} from "@/templates/preset-template-map";

const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function resolveLocalizedText(
  entity: EntityRecord,
  translations: EntityTranslation[],
  locale: string,
  field: "title" | "excerpt" | "body",
): string {
  const ctx = { translations };
  const fromTranslation =
    resolveTranslation(field, locale, ctx) ||
    resolveTranslation(field, DEFAULT_LOCALE_CODE, ctx);
  if (fromTranslation) return fromTranslation;
  if (field === "title") return entity.title;
  if (field === "excerpt") return entity.excerpt ?? "";
  return readString(entity.fields.body) ?? "";
}

export function resolveKnowledgeArticleHref(input: {
  knowledgeBaseSlug: string;
  articleSlug: string;
  localePrefix: string;
  basePath?: string;
}): string {
  const base = (input.basePath ?? "/help").replace(/\/$/, "");
  return `/${input.localePrefix}${base}/${input.knowledgeBaseSlug}/${input.articleSlug}`;
}

function resolveRatingAverage(ratingSum: number, ratingCount: number): number | null {
  if (ratingCount <= 0) return null;
  return Math.round((ratingSum / ratingCount) * 10) / 10;
}

export type MapKnowledgeEntityInput = {
  entity: EntityRecord;
  itemTranslations?: EntityTranslation[];
  knowledgeBaseSlug?: string;
  basePath?: string;
};

export function mapKnowledgeEntityToCardViewModel(
  input: MapKnowledgeEntityInput,
  ctx: ResolverContext,
): KnowledgeArticleCardViewModel {
  const { entity } = input;
  const fields = entity.fields;
  const kbSlug =
    input.knowledgeBaseSlug ??
    readString(fields.knowledgeBaseSlug) ??
    "";
  const ratingSum = readNumber(fields.ratingSum) ?? 0;
  const ratingCount = readNumber(fields.ratingCount) ?? 0;
  const categorySlug =
    readString(fields.categorySlug) ?? entity.collectionSlug ?? null;

  const title = resolveLocalizedText(entity, input.itemTranslations ?? [], ctx.locale, "title");
  const excerpt = resolveLocalizedText(
    entity,
    input.itemTranslations ?? [],
    ctx.locale,
    "excerpt",
  );

  const href =
    entity.href?.trim() ||
    resolveKnowledgeArticleHref({
      knowledgeBaseSlug: kbSlug,
      articleSlug: entity.ref.slug,
      localePrefix: ctx.localePrefix,
      basePath: input.basePath,
    });

  return {
    templateId: resolveKnowledgeArticleCardTemplateId(),
    presetId: "knowledge",
    entityId: entity.ref.id,
    slug: entity.ref.slug,
    knowledgeBaseSlug: kbSlug,
    title,
    excerpt,
    href,
    categorySlug,
    ratingAverage: resolveRatingAverage(ratingSum, ratingCount),
    ratingCount,
  };
}

export function mapKnowledgeEntityToDetailViewModel(
  input: MapKnowledgeEntityInput,
  ctx: ResolverContext,
): KnowledgeArticleDetailViewModel {
  const card = mapKnowledgeEntityToCardViewModel(input, ctx);
  const body = resolveLocalizedText(
    input.entity,
    input.itemTranslations ?? [],
    ctx.locale,
    "body",
  );

  return {
    templateId: resolveKnowledgeArticleDetailTemplateId(),
    presetId: "knowledge",
    entityId: card.entityId,
    slug: card.slug,
    knowledgeBaseSlug: card.knowledgeBaseSlug,
    title: card.title,
    excerpt: card.excerpt,
    body,
    href: card.href,
    categorySlug: card.categorySlug,
    ratingAverage: card.ratingAverage,
    ratingCount: card.ratingCount,
  };
}
