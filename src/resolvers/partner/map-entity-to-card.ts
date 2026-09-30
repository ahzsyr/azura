import type { EntityTranslation } from "@prisma/client";
import type { EntityRecord } from "@/features/entities/types";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import type { PartnerCardViewModel } from "@/view-models/partner-card";
import type { ResolverContext } from "@/view-models/types";
import { resolvePartnerCardTemplateId } from "@/templates/preset-template-map";

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

export type MapPartnerEntityInput = {
  entity: EntityRecord;
  itemTranslations?: EntityTranslation[];
  partnerProgramSlug?: string;
};

export function mapPartnerEntityToCardViewModel(
  input: MapPartnerEntityInput,
  ctx: ResolverContext,
): PartnerCardViewModel {
  const { entity } = input;
  const fields = entity.fields;
  const translations = input.itemTranslations ?? [];
  const programSlug =
    input.partnerProgramSlug ?? readString(fields.partnerProgramSlug) ?? "";
  const name = resolveLocalizedName(entity, translations, ctx.locale);
  const description = resolveLocalizedField(
    translations,
    ctx.locale,
    "description",
    readString(fields.description) ?? entity.description ?? "",
  );
  const location = resolveLocalizedField(
    translations,
    ctx.locale,
    "location",
    readString(fields.location) ?? "",
  );
  const logoUrl = readString(fields.logoUrl) ?? entity.thumbnailUrl ?? "";

  return {
    templateId: resolvePartnerCardTemplateId(),
    presetId: "partner",
    entityId: entity.ref.id,
    partnerProgramSlug: programSlug,
    categorySlug: readString(fields.categorySlug) ?? entity.collectionSlug ?? null,
    name,
    description,
    location,
    logoUrl,
    logoAlt: name,
    websiteUrl: readString(fields.websiteUrl) ?? "",
    profileUrl: readString(fields.profileUrl) ?? "",
    email: readString(fields.email) ?? "",
    phone: readString(fields.phone) ?? "",
    certifications: readStringArray(fields.certifications),
  };
}
