import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  loadBundleForRefs,
  localizedField,
  type EntityRef,
} from "@/features/portal/lib/portal-translation";
import type { PartnerProgramAdmin, PartnerProgramBlockInput, PartnerProgramPublic } from "./types";

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

function parseCertifications(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === "string");
}

function collectPartnerProgramRefs(row: {
  id: string;
  categories: { id: string }[];
  partners: { id: string }[];
}): EntityRef[] {
  return [
    { entityType: "PartnerProgram", entityId: row.id },
    ...row.categories.map((c) => ({ entityType: "PartnerCategory", entityId: c.id })),
    ...row.partners.map((p) => ({ entityType: "Partner", entityId: p.id })),
  ];
}

function locationMatchesFilter(
  location: Record<string, string>,
  needle: string
): boolean {
  return Object.values(location).some((value) => value.toLowerCase().includes(needle));
}

export const partnerProgramService = {
  async getBySlug(
    slug: string,
    opts?: Pick<PartnerProgramBlockInput, "categorySlug" | "locationFilter" | "limit">
  ): Promise<PartnerProgramPublic | null> {
    const partnerWhere: Prisma.PartnerWhereInput = { isPublished: true };
    if (opts?.categorySlug) {
      partnerWhere.category = { slug: opts.categorySlug };
    }

    const row = await prisma.partnerProgram.findFirst({
      where: { slug, isPublished: true },
      include: {
        categories: { orderBy: { sortOrder: "asc" } },
        partners: {
          where: partnerWhere,
          orderBy: { sortOrder: "asc" },
          include: { category: { select: { slug: true } } },
        },
      },
    });
    if (!row) return null;

    const bundle = await loadBundleForRefs(collectPartnerProgramRefs(row));

    const locationNeedle = opts?.locationFilter?.trim().toLowerCase();
    let partners = row.partners;
    if (locationNeedle) {
      partners = partners.filter((p) => {
        const location = localizedField(bundle, "Partner", p.id, "location");
        return locationMatchesFilter(location, locationNeedle);
      });
    }
    if (opts?.limit && opts.limit > 0) {
      partners = partners.slice(0, opts.limit);
    }

    return {
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "PartnerProgram", row.id, "title"),
      description: localizedField(bundle, "PartnerProgram", row.id, "description"),
      categories: row.categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: localizedField(bundle, "PartnerCategory", c.id, "name"),
      })),
      partners: partners.map((p) => ({
        id: p.id,
        categoryId: p.categoryId,
        categorySlug: p.category?.slug ?? null,
        name: localizedField(bundle, "Partner", p.id, "name"),
        description: localizedField(bundle, "Partner", p.id, "description"),
        logoUrl: p.logoUrl,
        websiteUrl: p.websiteUrl,
        profileUrl: p.profileUrl,
        email: p.email,
        phone: p.phone,
        location: localizedField(bundle, "Partner", p.id, "location"),
        latitude: toNumber(p.latitude),
        longitude: toNumber(p.longitude),
        certifications: parseCertifications(p.certifications),
      })),
    };
  },

  async listForAdmin(): Promise<PartnerProgramAdmin[]> {
    const rows = await prisma.partnerProgram.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { categories: true, partners: true } } },
    });
    const bundle = await loadBundleForRefs(
      rows.map((row) => ({ entityType: "PartnerProgram", entityId: row.id }))
    );
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "PartnerProgram", row.id, "title"),
      description: localizedField(bundle, "PartnerProgram", row.id, "description"),
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      categoryCount: row._count.categories,
      partnerCount: row._count.partners,
    }));
  },

  async getByIdForAdmin(id: string) {
    return prisma.partnerProgram.findUnique({
      where: { id },
      include: {
        categories: { orderBy: { sortOrder: "asc" } },
        partners: { orderBy: { sortOrder: "asc" } },
      },
    });
  },
};
