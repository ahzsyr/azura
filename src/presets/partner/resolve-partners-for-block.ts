import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entityService } from "@/features/entities/entity.service";
import { translationService } from "@/features/translation/translation.service";
import { mapPartnerEntityToCardViewModel } from "@/resolvers/partner/map-entity-to-card";
import type { PartnerCardViewModel } from "@/view-models/partner-card";
import type { ResolverContext } from "@/view-models/types";
import { resolvePartnerCardTemplateId } from "@/templates/preset-template-map";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

export type PartnerCategoryView = {
  id: string;
  slug: string;
  name: string;
};

export type PartnerBlockResolvedData = {
  partnerProgramSlug: string;
  programTitle: string;
  categories: PartnerCategoryView[];
  partnerViewModels: PartnerCardViewModel[];
};

export type ResolvePartnersForBlockInput = {
  partnerProgramSlug: string;
  categorySlug?: string;
  locationFilter?: string;
  limit?: number;
  presetId?: string;
  templateId?: string;
};

async function resolveProgramTitle(programId: string, locale: string): Promise<string> {
  const translations = await translationService.getForEntity("PartnerProgram", programId);
  const ctx = { translations };
  return (
    resolveTranslation("title", locale, ctx) ||
    resolveTranslation("title", DEFAULT_LOCALE_CODE, ctx) ||
    ""
  );
}

export async function resolvePartnersForBlock(
  input: ResolvePartnersForBlockInput,
  ctx: ResolverContext,
): Promise<PartnerBlockResolvedData | null> {
  const programSlug = input.partnerProgramSlug.trim();
  if (!programSlug) return null;

  const program = await prisma.partnerProgram.findFirst({
    where: { slug: programSlug, isPublished: true },
    select: {
      id: true,
      slug: true,
      categories: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!program) return null;

  const categoryIds = program.categories.map((c) => c.id);
  const categoryTranslationMap =
    categoryIds.length > 0
      ? await translationService.getForEntities("PartnerCategory", categoryIds)
      : new Map<string, EntityTranslation[]>();

  const categories: PartnerCategoryView[] = program.categories.map((cat) => {
    const translations = categoryTranslationMap.get(cat.id) ?? [];
    const tctx = { translations };
    const name =
      resolveTranslation("name", ctx.locale, tctx) ||
      resolveTranslation("name", DEFAULT_LOCALE_CODE, tctx) ||
      cat.slug;
    return { id: cat.id, slug: cat.slug, name };
  });

  const partnerRows = await entityService.listEntities("partner", {
    partnerProgramSlug: programSlug,
    collectionSlug: input.categorySlug || undefined,
    locationFilter: input.locationFilter || undefined,
    limit: input.limit && input.limit > 0 ? input.limit : undefined,
  });

  const partnerIds = partnerRows.map((row) => row.ref.id);
  const partnerTranslationMap =
    partnerIds.length > 0
      ? await translationService.getForEntities("Partner", partnerIds)
      : new Map<string, EntityTranslation[]>();

  const templateId = input.templateId ?? resolvePartnerCardTemplateId();
  const partnerViewModels: PartnerCardViewModel[] = [];

  for (const row of partnerRows) {
    const entity = await entityService.getEntity("partner", row.ref.id, {
      locale: ctx.localePrefix,
      partnerProgramSlug: programSlug,
    });
    if (!entity) continue;

    const vm = mapPartnerEntityToCardViewModel(
      {
        entity,
        itemTranslations: partnerTranslationMap.get(row.ref.id) ?? [],
        partnerProgramSlug: programSlug,
      },
      ctx,
    );
    if (templateId !== vm.templateId) continue;
    partnerViewModels.push(vm);
  }

  const programTitle = await resolveProgramTitle(program.id, ctx.locale);

  return {
    partnerProgramSlug: program.slug,
    programTitle,
    categories,
    partnerViewModels,
  };
}
