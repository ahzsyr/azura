import type { EntityTranslation } from "@prisma/client";
import type { EntityRecord } from "@/features/entities/types";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import type { TeamMemberCardViewModel } from "@/view-models/team-member-card";
import type { ResolverContext } from "@/view-models/types";
import { resolveTeamMemberCardTemplateId } from "@/templates/preset-template-map";

const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function resolveLocalizedName(
  entity: EntityRecord,
  translations: EntityTranslation[],
  locale: string,
): string {
  const ctx = { translations };
  return (
    resolveTranslation("name", locale, ctx) ||
    resolveTranslation("name", DEFAULT_LOCALE_CODE, ctx) ||
    entity.title
  );
}

function resolveLocalizedField(
  translations: EntityTranslation[],
  locale: string,
  field: string,
  fallback = "",
): string {
  const ctx = { translations };
  return (
    resolveTranslation(field, locale, ctx) ||
    resolveTranslation(field, DEFAULT_LOCALE_CODE, ctx) ||
    fallback
  );
}

export type MapTeamMemberEntityInput = {
  entity: EntityRecord;
  itemTranslations?: EntityTranslation[];
  teamDirectorySlug?: string;
};

export function mapTeamMemberEntityToCardViewModel(
  input: MapTeamMemberEntityInput,
  ctx: ResolverContext,
): TeamMemberCardViewModel {
  const { entity } = input;
  const fields = entity.fields;
  const translations = input.itemTranslations ?? [];
  const directorySlug =
    input.teamDirectorySlug ?? readString(fields.teamDirectorySlug) ?? "";
  const name = resolveLocalizedName(entity, translations, ctx.locale);
  const role = resolveLocalizedField(translations, ctx.locale, "role", readString(fields.role) ?? "");
  const bio = resolveLocalizedField(translations, ctx.locale, "bio", readString(fields.bio) ?? "");
  const location = resolveLocalizedField(
    translations,
    ctx.locale,
    "location",
    readString(fields.location) ?? "",
  );
  const imageUrl = readString(fields.imageUrl) ?? entity.thumbnailUrl ?? "";

  return {
    templateId: resolveTeamMemberCardTemplateId(),
    presetId: "team-member",
    entityId: entity.ref.id,
    teamDirectorySlug: directorySlug,
    departmentId: readString(fields.departmentId),
    name,
    role,
    bio,
    email: readString(fields.email) ?? "",
    phone: readString(fields.phone) ?? "",
    location,
    skills: readStringArray(fields.skills),
    imageUrl,
    imageAlt: name,
  };
}
