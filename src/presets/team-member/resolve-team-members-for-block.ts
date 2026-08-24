import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entityService } from "@/features/entities/entity.service";
import { translationService } from "@/features/translation/translation.service";
import { mapTeamMemberEntityToCardViewModel } from "@/resolvers/team-member/map-entity-to-card";
import type { TeamMemberCardViewModel } from "@/view-models/team-member-card";
import type { ResolverContext } from "@/view-models/types";
import { resolveTeamMemberCardTemplateId } from "@/templates/preset-template-map";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

export type TeamDepartmentView = {
  id: string;
  name: string;
};

export type TeamBlockResolvedData = {
  teamDirectorySlug: string;
  directoryTitle: string;
  departments: TeamDepartmentView[];
  memberViewModels: TeamMemberCardViewModel[];
};

export type ResolveTeamMembersForBlockInput = {
  teamDirectorySlug: string;
  departmentId?: string;
  limit?: number;
  presetId?: string;
  templateId?: string;
};

async function resolveDirectoryTitle(directoryId: string, locale: string): Promise<string> {
  const translations = await translationService.getForEntity("TeamDirectory", directoryId);
  const ctx = { translations };
  return (
    resolveTranslation("title", locale, ctx) ||
    resolveTranslation("title", DEFAULT_LOCALE_CODE, ctx) ||
    ""
  );
}

export async function resolveTeamMembersForBlock(
  input: ResolveTeamMembersForBlockInput,
  ctx: ResolverContext,
): Promise<TeamBlockResolvedData | null> {
  const directorySlug = input.teamDirectorySlug.trim();
  if (!directorySlug) return null;

  const directory = await prisma.teamDirectory.findFirst({
    where: { slug: directorySlug, isPublished: true },
    select: {
      id: true,
      slug: true,
      departments: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!directory) return null;

  const departmentIds = directory.departments.map((d) => d.id);
  const departmentTranslationMap =
    departmentIds.length > 0
      ? await translationService.getForEntities("TeamDepartment", departmentIds)
      : new Map<string, EntityTranslation[]>();

  const departments: TeamDepartmentView[] = directory.departments.map((dept) => {
    const translations = departmentTranslationMap.get(dept.id) ?? [];
    const tctx = { translations };
    const name =
      resolveTranslation("name", ctx.locale, tctx) ||
      resolveTranslation("name", DEFAULT_LOCALE_CODE, tctx) ||
      dept.id;
    return { id: dept.id, name };
  });

  const memberRows = await entityService.listEntities("team-member", {
    teamDirectorySlug: directorySlug,
    departmentId: input.departmentId || undefined,
    limit: input.limit && input.limit > 0 ? input.limit : undefined,
  });

  const memberIds = memberRows.map((row) => row.ref.id);
  const memberTranslationMap =
    memberIds.length > 0
      ? await translationService.getForEntities("TeamMember", memberIds)
      : new Map<string, EntityTranslation[]>();

  const templateId = input.templateId ?? resolveTeamMemberCardTemplateId();
  const memberViewModels: TeamMemberCardViewModel[] = [];

  for (const row of memberRows) {
    const entity = await entityService.getEntity("team-member", row.ref.id, {
      locale: ctx.localePrefix,
      teamDirectorySlug: directorySlug,
    });
    if (!entity) continue;

    const vm = mapTeamMemberEntityToCardViewModel(
      {
        entity,
        itemTranslations: memberTranslationMap.get(row.ref.id) ?? [],
        teamDirectorySlug: directorySlug,
      },
      ctx,
    );
    if (templateId !== vm.templateId) continue;
    memberViewModels.push(vm);
  }

  const directoryTitle = await resolveDirectoryTitle(directory.id, ctx.locale);

  return {
    teamDirectorySlug: directory.slug,
    directoryTitle,
    departments,
    memberViewModels,
  };
}
