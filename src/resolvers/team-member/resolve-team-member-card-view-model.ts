import "server-only";

import { entityService } from "@/features/entities/entity.service";
import { EntityNotFoundError } from "@/resolvers/errors";
import {
  mapTeamMemberEntityToCardViewModel,
  type MapTeamMemberEntityInput,
} from "@/resolvers/team-member/map-entity-to-card";
import type { TeamMemberCardViewModel } from "@/view-models/team-member-card";
import type { ResolverContext } from "@/view-models/types";
import { translationService } from "@/features/translation/translation.service";

export async function resolveTeamMemberCardViewModel(
  entityId: string,
  ctx: ResolverContext,
  options?: { teamDirectorySlug?: string },
): Promise<TeamMemberCardViewModel> {
  const key = entityId.trim();
  const entity = await entityService.getEntity("team-member", key, {
    locale: ctx.localePrefix,
    teamDirectorySlug: options?.teamDirectorySlug,
  });
  if (!entity) {
    throw new EntityNotFoundError("team-member", key);
  }

  const translations = await translationService.getForEntity("TeamMember", entity.ref.id);
  const directorySlug =
    options?.teamDirectorySlug ??
    (typeof entity.fields.teamDirectorySlug === "string" ? entity.fields.teamDirectorySlug : "");

  return mapTeamMemberEntityToCardViewModel(
    {
      entity,
      itemTranslations: translations,
      teamDirectorySlug: directorySlug,
    },
    ctx,
  );
}

export function resolveTeamMemberCardViewModelFromEntity(
  input: MapTeamMemberEntityInput,
  ctx: ResolverContext,
): TeamMemberCardViewModel {
  return mapTeamMemberEntityToCardViewModel(input, ctx);
}
