import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import { entityUrl } from "../identity/canonical-url.service";

const LOCAL_BUSINESS_TYPES = new Set([
  "ElectronicsStore",
  "WholesaleStore",
  "ComputerStore",
  "ProfessionalService",
  "Store",
  "LocalBusiness",
]);

export function isLocalBusinessEntityType(type: string | undefined): boolean {
  if (!type) return false;
  return LOCAL_BUSINESS_TYPES.has(type);
}

function readLocalizedField(ctx: SchemaContext, field: string): string {
  const legacy = ctx.site.company?.localizedLegacy;
  if (!legacy) return "";
  const locale = ctx.runtime.locale;
  return (
    legacy[`${field}${locale.charAt(0).toUpperCase()}${locale.slice(1)}`] ??
    legacy[`${field}En`] ??
    legacy[field] ??
    ""
  ).trim();
}

function parseSameAs(socialLinks: unknown): string[] {
  if (!socialLinks || typeof socialLinks !== "object") return [];
  return Object.values(socialLinks as Record<string, unknown>)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

export const OrganizationBuilder = {
  id: "organization",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    return Boolean(ctx.site.company?.name);
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const company = ctx.site.company;
    if (!company) return [];

    const address = readLocalizedField(ctx, "address");
    const imageRefs = ctx.site.businessPhotos.map((photo) =>
      entityRef(`image-${photo.role}-${photo.url}`, ctx),
    );

    const entityType = ctx.site.structuredConfig.entityType ?? "Organization";
    const orgType =
      entityType === "Organization" || entityType === "Corporation" ? entityType : "Organization";

    const node: SchemaNode = {
      "@type": orgType,
      "@id": entityUrl("organization", ctx),
      name: company.name,
      url: ctx.runtime.siteOrigin,
      logo: entityRef("logo-image", ctx),
      ...(imageRefs.length ? { image: imageRefs } : {}),
      sameAs: parseSameAs(company.socialLinks),
      contactPoint: {
        "@type": "ContactPoint",
        telephone: company.phone,
        email: company.email,
        contactType: "customer service",
      },
      ...(address
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: address,
            },
          }
        : {}),
      ...(company.registrationNo
        ? {
            identifier: company.registrationNo,
          }
        : {}),
    };

    const reviews = ctx.page.reviews ?? [];
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      node.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: avg,
        reviewCount: reviews.length,
        bestRating: "5",
        worstRating: "1",
      };
      node.review = reviews.map((review) => ({
        "@type": "Review",
        author: { "@type": "Person", name: review.name },
        reviewRating: { "@type": "Rating", ratingValue: review.rating },
        reviewBody: review.content,
      }));
    }

    return [node];
  },
};

export const LocalBusinessBuilder = {
  id: "local-business",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    const entityType = ctx.site.structuredConfig.entityType;
    return isLocalBusinessEntityType(entityType) && Boolean(ctx.site.company?.name);
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const company = ctx.site.company;
    if (!company) return [];

    const entityType = ctx.site.structuredConfig.entityType ?? "LocalBusiness";
    const address = readLocalizedField(ctx, "address");
    const officeHours = readLocalizedField(ctx, "officeHours");

    const node: SchemaNode = {
      "@type": entityType,
      "@id": entityUrl("local-business", ctx),
      name: company.name,
      url: ctx.runtime.siteOrigin,
      parentOrganization: entityRef("organization", ctx),
      telephone: company.phone,
      email: company.email,
      ...(address
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: address,
            },
          }
        : {}),
      ...(officeHours ? { openingHours: officeHours } : {}),
    };

    return [node];
  },
};
