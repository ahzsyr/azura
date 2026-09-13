import type { DataSourceKind, SourceRecord } from "../types";
import { slugifyEntitySegment } from "./ids";

/** Minimal company shape for graph ingestion (avoids Prisma coupling). */
export type CompanySourceInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  registrationNo?: string | null;
  socialLinks?: unknown;
};

function socialSameAs(socialLinks: unknown): string[] {
  if (!socialLinks || typeof socialLinks !== "object") return [];
  return Object.values(socialLinks as Record<string, unknown>)
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

/** Map company profile into Organization + ExternalProfile source records. */
export function companyInfoToSourceRecords(
  company: CompanySourceInput | null | undefined,
  options?: { editor?: string | null; source?: DataSourceKind },
): SourceRecord[] {
  if (!company?.name?.trim()) return [];

  const slug = slugifyEntitySegment(company.name);
  const sameAs = socialSameAs(company.socialLinks);
  const source = options?.source ?? "company_profile";
  const records: SourceRecord[] = [
    {
      source,
      sourceKey: `company:${slug}`,
      entityType: "Organization",
      slug,
      editor: options?.editor ?? null,
      properties: {
        name: company.name,
        legalName: company.name,
        email: company.email ?? null,
        phone: company.phone ?? null,
        registrationNo: company.registrationNo ?? null,
        sameAs,
      },
      relationships: sameAs.map((_url, index) => ({
        type: "SAME_AS" as const,
        toType: "ExternalProfile" as const,
        toSlug: `${slug}-profile-${index + 1}`,
      })),
    },
  ];

  sameAs.forEach((url, index) => {
    records.push({
      source: "social",
      sourceKey: `social:${slug}:${index}`,
      entityType: "ExternalProfile",
      slug: `${slug}-profile-${index + 1}`,
      properties: {
        url,
        name: url,
      },
    });
  });

  return records;
}

export function productToSourceRecord(input: {
  slug: string;
  name: string;
  description?: string | null;
  brandSlug?: string | null;
  categorySlug?: string | null;
  imageUrl?: string | null;
}): SourceRecord {
  return {
    source: "product_catalog",
    sourceKey: `product:${input.slug}`,
    entityType: "Product",
    slug: input.slug,
    properties: {
      name: input.name,
      description: input.description ?? null,
      image: input.imageUrl ?? null,
    },
    relationships: [
      ...(input.brandSlug
        ? [{ type: "RELATED_TO" as const, toType: "Brand" as const, toSlug: input.brandSlug }]
        : []),
      ...(input.categorySlug
        ? [
            {
              type: "BELONGS_TO_CATEGORY" as const,
              toType: "Category" as const,
              toSlug: input.categorySlug,
            },
          ]
        : []),
    ],
  };
}

export function articleToSourceRecord(input: {
  slug: string;
  title: string;
  excerpt?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
}): SourceRecord {
  return {
    source: "cms",
    sourceKey: `article:${input.slug}`,
    entityType: "Article",
    slug: input.slug,
    properties: {
      name: input.title,
      headline: input.title,
      description: input.excerpt ?? null,
      authorName: input.authorName ?? null,
      datePublished: input.publishedAt ?? null,
    },
  };
}

export function webpageToSourceRecord(input: {
  slug: string;
  url: string;
  title: string;
  description?: string | null;
}): SourceRecord {
  return {
    source: "cms",
    sourceKey: `webpage:${input.slug}`,
    entityType: "WebPage",
    slug: input.slug,
    properties: {
      name: input.title,
      url: input.url,
      description: input.description ?? null,
    },
  };
}
