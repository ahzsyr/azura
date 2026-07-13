import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { partnerRepository } from "@/repositories/partner.repository";
import { translationService } from "@/features/translation/translation.service";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type {
  Collection,
  EntityGetOptions,
  EntityListOptions,
  EntityListRow,
  EntityRecord,
} from "@/features/entities/types";
import type { EntityStorageAdapter } from "@/features/entities/adapters/types";

const PRESET_ID = "partner" as const;
const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

type PartnerRow = {
  id: string;
  programId: string;
  categoryId: string | null;
  logoUrl: string;
  websiteUrl: string;
  profileUrl: string;
  email: string;
  phone: string;
  latitude: { toString(): string } | null;
  longitude: { toString(): string } | null;
  certifications: unknown;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: Date;
  category?: { slug: string } | null;
  program?: { slug: string; isPublished?: boolean } | null;
};

function looksLikePartnerId(value: string): boolean {
  return CUID_PATTERN.test(value.trim());
}

function parseCertifications(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === "string");
}

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveName(translations: EntityTranslation[], fallback: string): string {
  const ctx = { translations };
  return (
    resolveTranslation("name", "en", ctx) ||
    resolveTranslation("name", "ar", ctx) ||
    fallback
  );
}

function locationMatchesFilter(
  translations: EntityTranslation[],
  needle: string,
): boolean {
  const ctx = { translations };
  const en = resolveTranslation("location", "en", ctx) ?? "";
  const ar = resolveTranslation("location", "ar", ctx) ?? "";
  return `${en} ${ar}`.toLowerCase().includes(needle);
}

function mapPartnerToListRow(partner: PartnerRow, translations: EntityTranslation[]): EntityListRow {
  const title = resolveName(translations, partner.id);
  return {
    ref: {
      presetId: PRESET_ID,
      storage: "portal",
      id: partner.id,
      slug: partner.id,
    },
    title,
    status: partner.isPublished ? "PUBLISHED" : "DRAFT",
    thumbnailUrl: partner.logoUrl || null,
    collectionSlug: partner.category?.slug ?? null,
    updatedAt: partner.updatedAt,
  };
}

function mapPartnerToRecord(
  partner: PartnerRow,
  programSlug: string,
  translations: EntityTranslation[],
): EntityRecord {
  const ctx = { translations };
  const title = resolveName(translations, partner.id);
  const description =
    resolveTranslation("description", "en", ctx) ||
    resolveTranslation("description", "ar", ctx) ||
    "";
  const location =
    resolveTranslation("location", "en", ctx) ||
    resolveTranslation("location", "ar", ctx) ||
    "";

  return {
    ref: {
      presetId: PRESET_ID,
      storage: "portal",
      id: partner.id,
      slug: partner.id,
    },
    title,
    titleEn: resolveTranslation("name", "en", ctx) || undefined,
    titleAr: resolveTranslation("name", "ar", ctx) || undefined,
    description,
    excerpt: description,
    status: partner.isPublished ? "PUBLISHED" : "DRAFT",
    thumbnailUrl: partner.logoUrl || null,
    collectionSlug: partner.category?.slug ?? null,
    updatedAt: partner.updatedAt,
    fields: {
      description,
      location,
      logoUrl: partner.logoUrl,
      websiteUrl: partner.websiteUrl,
      profileUrl: partner.profileUrl,
      email: partner.email,
      phone: partner.phone,
      latitude: toNumber(partner.latitude),
      longitude: toNumber(partner.longitude),
      certifications: parseCertifications(partner.certifications),
      categoryId: partner.categoryId,
      categorySlug: partner.category?.slug ?? null,
      partnerProgramSlug: programSlug,
      programId: partner.programId,
    },
  };
}

async function resolvePartnerProgram(
  slug: string | undefined,
  publishedOnly: boolean,
): Promise<{ id: string; slug: string } | null> {
  const trimmed = slug?.trim();
  if (!trimmed) return null;
  return partnerRepository.findProgram(trimmed, publishedOnly);
}

export function createPartnerAdapter(): EntityStorageAdapter {
  return {
    async list(options?: EntityListOptions): Promise<EntityListRow[]> {
      const program = await resolvePartnerProgram(
        options?.partnerProgramSlug,
        !options?.includeDeleted,
      );
      if (!program) return [];

      let partners = await partnerRepository.findPartners({
        programId: program.id,
        publishedOnly: !options?.includeDeleted,
        collectionSlug: options?.collectionSlug,
      });

      const ids = partners.map((p) => p.id);
      const translationMap =
        ids.length > 0
          ? await translationService.getForEntities("Partner", ids)
          : new Map<string, EntityTranslation[]>();

      const locationNeedle = options?.locationFilter?.trim().toLowerCase();
      if (locationNeedle) {
        partners = partners.filter((partner) =>
          locationMatchesFilter(translationMap.get(partner.id) ?? [], locationNeedle),
        );
      }

      if (options?.limit && options.limit > 0) {
        partners = partners.slice(0, options.limit);
      }

      return partners.map((partner) =>
        mapPartnerToListRow(partner, translationMap.get(partner.id) ?? []),
      );
    },

    async get(idOrSlug: string, options?: EntityGetOptions): Promise<EntityRecord | null> {
      const key = idOrSlug.trim();
      if (!key) return null;

      const publishedOnly = !options?.includeDeleted;
      let partner: PartnerRow | null = null;
      let programSlug = options?.partnerProgramSlug?.trim() ?? "";

      if (looksLikePartnerId(key)) {
        partner = await partnerRepository.findPartnerById(key);
        if (partner?.program) {
          if (publishedOnly && (!partner.isPublished || !partner.program.isPublished)) {
            return null;
          }
          programSlug = partner.program.slug;
        }
      } else {
        return null;
      }

      if (!partner || !programSlug) return null;

      const translations = await translationService.getForEntity("Partner", partner.id);
      return mapPartnerToRecord(partner, programSlug, translations);
    },

    async listCollections(options?: EntityListOptions): Promise<Collection[]> {
      const program = await resolvePartnerProgram(
        options?.partnerProgramSlug,
        !options?.includeDeleted,
      );
      if (!program) return [];

      const categories = await partnerRepository.findCategories(program.id);

      const ids = categories.map((c) => c.id);
      const translationMap =
        ids.length > 0
          ? await translationService.getForEntities("PartnerCategory", ids)
          : new Map<string, EntityTranslation[]>();

      return categories.map((category, index) => {
        const translations = translationMap.get(category.id) ?? [];
        const title = resolveName(translations, category.slug);
        return {
          id: category.id,
          slug: category.slug,
          title,
          presetId: PRESET_ID,
          sortOrder: category.sortOrder ?? index,
        };
      });
    },
  };
}
