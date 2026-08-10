import "server-only";

import type { EntityPresetId } from "@/features/entities/types";
import type { ProductSelectionConfig } from "@/features/builder/blocks/commerce/product-blocks/schemas/product-blocks";
import type { ContentBlockConfig } from "@/features/content/types";
import { resolveProductSource } from "@/features/builder/blocks/commerce/commerce-showcase/lib/resolve-product-source";
import {
  EntityNotFoundError,
  TemplateNotActiveError,
  TemplatePresetMismatchError,
  UnknownTemplateError,
} from "@/resolvers/errors";
import {
  resolveProductCardViewModel,
  resolveProductCardViewModelFromListing,
} from "@/resolvers/product/resolve-product-card-view-model";
import {
  resolveProductDetailViewModel,
  type ResolveProductDetailInput,
} from "@/resolvers/product/resolve-product-detail-view-model";
import {
  resolveContentPresetCardViewModel,
} from "@/resolvers/content-preset/resolve-content-preset-card-view-model";
import {
  resolveContentPresetCardsForList,
} from "@/resolvers/content-preset/resolve-content-preset-cards-for-list";
import {
  resolveContentPresetDetailViewModel,
  type ResolveContentPresetDetailInput,
} from "@/resolvers/content-preset/resolve-content-preset-detail-view-model";
import {
  resolveKnowledgeArticleCardViewModel,
} from "@/resolvers/knowledge/resolve-knowledge-article-card-view-model";
import {
  resolveKnowledgeArticleDetailViewModel,
  type ResolveKnowledgeArticleDetailInput,
} from "@/resolvers/knowledge/resolve-knowledge-article-detail-view-model";
import { resolveTeamMemberCardViewModel } from "@/resolvers/team-member/resolve-team-member-card-view-model";
import { resolvePartnerCardViewModel } from "@/resolvers/partner/resolve-partner-card-view-model";
import { resolvePricingPlanCardViewModel } from "@/resolvers/pricing/resolve-pricing-plan-card-view-model";
import { getTemplateDefinition, isActiveTemplateId } from "@/templates/registry";
import {
  isContentPresetId,
  resolveCardTemplateId,
  type ContentPresetId,
} from "@/templates/preset-template-map";
import type { ActiveTemplateId, ResolverContext, ViewModel } from "@/view-models/types";
import type { ProductCardDisplayOverrides } from "@/features/products/lib/product-card-display";

export type ResolveViewModelOptions = {
  productCard?: {
    href?: string;
    displayOverrides?: ProductCardDisplayOverrides;
  };
  productDetail?: ResolveProductDetailInput;
  contentPresetDetail?: ResolveContentPresetDetailInput;
  knowledgeArticleDetail?: ResolveKnowledgeArticleDetailInput;
  teamMemberCard?: { teamDirectorySlug?: string };
  partnerCard?: { partnerProgramSlug?: string };
  pricingPlanCard?: { pricingPlanSetSlug?: string; currency?: string };
};

function assertContentPresetTemplate(
  templateId: ActiveTemplateId,
  presetId: EntityPresetId,
): ContentPresetId {
  if (!isContentPresetId(presetId)) {
    throw new TemplatePresetMismatchError(templateId, presetId, "destination|service|property");
  }
  return presetId;
}

export async function resolveViewModel(
  presetId: EntityPresetId,
  templateId: ActiveTemplateId,
  entityId: string,
  ctx: ResolverContext,
  options?: ResolveViewModelOptions,
): Promise<ViewModel> {
  const definition = getTemplateDefinition(templateId);
  if (!definition) {
    throw new UnknownTemplateError(templateId);
  }
  if (!isActiveTemplateId(templateId)) {
    throw new TemplateNotActiveError(templateId);
  }
  if (definition.presetId && definition.presetId !== presetId) {
    throw new TemplatePresetMismatchError(templateId, presetId, definition.presetId);
  }

  switch (templateId) {
    case "product-card":
      return resolveProductCardViewModel(entityId, ctx, options?.productCard);
    case "product-detail": {
      const detailInput = options?.productDetail;
      if (!detailInput) {
        throw new Error("resolveViewModel(product-detail) requires options.productDetail");
      }
      return resolveProductDetailViewModel(entityId, ctx, detailInput);
    }
    case "destination-card":
    case "service-card":
    case "property-card":
      return resolveContentPresetCardViewModel(
        assertContentPresetTemplate(templateId, presetId),
        entityId,
        ctx,
      );
    case "destination-detail":
    case "service-detail":
    case "property-detail": {
      const detailInput = options?.contentPresetDetail;
      if (!detailInput) {
        throw new Error(`resolveViewModel(${templateId}) requires options.contentPresetDetail`);
      }
      return resolveContentPresetDetailViewModel(
        assertContentPresetTemplate(templateId, presetId),
        entityId,
        ctx,
        detailInput,
      );
    }
    case "knowledge-article-card":
      if (presetId !== "knowledge") {
        throw new TemplatePresetMismatchError(templateId, presetId, "knowledge");
      }
      return resolveKnowledgeArticleCardViewModel(entityId, ctx, {
        knowledgeBaseSlug: options?.knowledgeArticleDetail?.knowledgeBaseSlug,
        basePath: options?.knowledgeArticleDetail?.basePath,
      });
    case "knowledge-article-detail": {
      if (presetId !== "knowledge") {
        throw new TemplatePresetMismatchError(templateId, presetId, "knowledge");
      }
      return resolveKnowledgeArticleDetailViewModel(
        entityId,
        ctx,
        options?.knowledgeArticleDetail,
      );
    }
    case "member-card":
      if (presetId !== "team-member") {
        throw new TemplatePresetMismatchError(templateId, presetId, "team-member");
      }
      return resolveTeamMemberCardViewModel(entityId, ctx, options?.teamMemberCard);
    case "partner-card":
      if (presetId !== "partner") {
        throw new TemplatePresetMismatchError(templateId, presetId, "partner");
      }
      return resolvePartnerCardViewModel(entityId, ctx, options?.partnerCard);
    case "plan-card":
      if (presetId !== "pricing") {
        throw new TemplatePresetMismatchError(templateId, presetId, "pricing");
      }
      return resolvePricingPlanCardViewModel(entityId, ctx, options?.pricingPlanCard);
    case "entity-card":
    case "entity-detail":
    case "entity-list":
      throw new Error(
        `resolveViewModel does not support ${templateId}; use content public resolvers for custom entity types`,
      );
    default: {
      const _exhaustive: never = templateId;
      throw new UnknownTemplateError(String(_exhaustive));
    }
  }
}

export async function resolveViewModelsForList(
  presetId: EntityPresetId,
  templateId: ActiveTemplateId,
  entityIds: string[],
  ctx: ResolverContext,
  options?: ResolveViewModelOptions,
): Promise<ViewModel[]> {
  const models: ViewModel[] = [];
  for (const entityId of entityIds) {
    try {
      models.push(await resolveViewModel(presetId, templateId, entityId, ctx, options));
    } catch (error) {
      if (error instanceof EntityNotFoundError) continue;
      throw error;
    }
  }
  return models;
}

export async function resolveViewModelsForSelection(
  presetId: EntityPresetId,
  templateId: ActiveTemplateId,
  selection: ProductSelectionConfig,
  ctx: ResolverContext,
  options?: ResolveViewModelOptions,
): Promise<ViewModel[]> {
  if (presetId !== "product" || templateId !== "product-card") {
    throw new TemplatePresetMismatchError(templateId, presetId, "product");
  }
  if (!ctx.cardTheme) {
    throw new Error("resolveViewModelsForSelection requires cardTheme in ResolverContext");
  }

  const records = await resolveProductSource(ctx.localePrefix, {
    source: selection.source,
    collectionSlug: selection.collectionSlug,
    productSlugs: selection.productSlugs,
    tags: selection.tags,
    limit: selection.limit,
    sortBy: selection.sortBy,
  });

  return records.map((record) =>
    resolveProductCardViewModelFromListing(record.id || record.slug, record, ctx, {
      href: `/${ctx.localePrefix}/products/${record.slug}`,
      displayOverrides: options?.productCard?.displayOverrides,
    }),
  );
}

export async function resolveViewModelsForContentList(
  presetId: ContentPresetId,
  templateId: Extract<
    ActiveTemplateId,
    "destination-card" | "service-card" | "property-card"
  >,
  config: ContentBlockConfig,
  ctx: ResolverContext,
): Promise<ViewModel[]> {
  if (templateId !== resolveCardTemplateId(presetId)) {
    throw new TemplatePresetMismatchError(templateId, presetId, presetId);
  }
  return resolveContentPresetCardsForList(presetId, config, ctx);
}
