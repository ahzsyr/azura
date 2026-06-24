import "server-only";

import { entityService } from "@/features/entities/entity.service";
import { EntityNotFoundError } from "@/resolvers/errors";
import {
  mapPartnerEntityToCardViewModel,
  type MapPartnerEntityInput,
} from "@/resolvers/partner/map-entity-to-card";
import type { PartnerCardViewModel } from "@/view-models/partner-card";
import type { ResolverContext } from "@/view-models/types";
import { translationService } from "@/features/translation/translation.service";

export async function resolvePartnerCardViewModel(
  entityId: string,
  ctx: ResolverContext,
  options?: { partnerProgramSlug?: string },
): Promise<PartnerCardViewModel> {
  const key = entityId.trim();
  const entity = await entityService.getEntity("partner", key, {
    locale: ctx.localePrefix,
    partnerProgramSlug: options?.partnerProgramSlug,
  });
  if (!entity) {
    throw new EntityNotFoundError("partner", key);
  }

  const translations = await translationService.getForEntity("Partner", entity.ref.id);
  const programSlug =
    options?.partnerProgramSlug ??
    (typeof entity.fields.partnerProgramSlug === "string"
      ? entity.fields.partnerProgramSlug
      : "");

  return mapPartnerEntityToCardViewModel(
    {
      entity,
      itemTranslations: translations,
      partnerProgramSlug: programSlug,
    },
    ctx,
  );
}

export function resolvePartnerCardViewModelFromEntity(
  input: MapPartnerEntityInput,
  ctx: ResolverContext,
): PartnerCardViewModel {
  return mapPartnerEntityToCardViewModel(input, ctx);
}
