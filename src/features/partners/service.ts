import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PartnerProgramAdmin, PartnerProgramBlockInput, PartnerProgramPublic } from "./types";

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

function parseCertifications(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === "string");
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

    const locationNeedle = opts?.locationFilter?.trim().toLowerCase();
    let partners = row.partners;
    if (locationNeedle) {
      partners = partners.filter(
        (p) =>
          p.locationEn.toLowerCase().includes(locationNeedle) ||
          p.locationAr.toLowerCase().includes(locationNeedle)
      );
    }
    if (opts?.limit && opts.limit > 0) {
      partners = partners.slice(0, opts.limit);
    }

    return {
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      categories: row.categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
      })),
      partners: partners.map((p) => ({
        id: p.id,
        categoryId: p.categoryId,
        categorySlug: p.category?.slug ?? null,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        descriptionEn: p.descriptionEn,
        descriptionAr: p.descriptionAr,
        logoUrl: p.logoUrl,
        websiteUrl: p.websiteUrl,
        profileUrl: p.profileUrl,
        email: p.email,
        phone: p.phone,
        locationEn: p.locationEn,
        locationAr: p.locationAr,
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
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
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
