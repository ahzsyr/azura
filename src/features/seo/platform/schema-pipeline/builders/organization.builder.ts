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

function parseKnowsAbout(raw: string): string[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    // fall through to comma-separated
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readOptionalNumber(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function buildOrganizationTypes(ctx: SchemaContext): string | string[] {
  const entityType = ctx.site.structuredConfig.entityType ?? "Organization";
  if (entityType === "Organization" || entityType === "Corporation") {
    return entityType;
  }
  if (isLocalBusinessEntityType(entityType)) {
    return ["Organization", entityType];
  }
  return "Organization";
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
    const legalName = readLocalizedField(ctx, "legalName");
    const schemaDescription = readLocalizedField(ctx, "schemaDescription");
    const foundingDate = readLocalizedField(ctx, "foundingDate");
    const areaServed = readLocalizedField(ctx, "areaServed");
    const latitude = readOptionalNumber(readLocalizedField(ctx, "latitude"));
    const longitude = readOptionalNumber(readLocalizedField(ctx, "longitude"));
    const knowsAbout = parseKnowsAbout(readLocalizedField(ctx, "knowsAbout"));
    const officeHours = readLocalizedField(ctx, "officeHours");
    const imageRefs = ctx.site.businessPhotos.map((photo) =>
      entityRef(`image-${photo.role}-${photo.url}`, ctx),
    );

    const orgTypes = buildOrganizationTypes(ctx);
    const entityType = ctx.site.structuredConfig.entityType;
    const isLocalBusiness = isLocalBusinessEntityType(entityType);

    const node: SchemaNode = {
      "@type": orgTypes,
      "@id": entityUrl("organization", ctx),
      name: company.name,
      url: ctx.runtime.siteOrigin,
      logo: entityRef("logo-image", ctx),
      ...(imageRefs.length ? { image: imageRefs } : {}),
      ...(legalName ? { legalName } : {}),
      ...(schemaDescription ? { description: schemaDescription } : {}),
      ...(foundingDate ? { foundingDate } : {}),
      ...(parseSameAs(company.socialLinks).length
        ? { sameAs: parseSameAs(company.socialLinks) }
        : {}),
      ...(company.phone || company.email
        ? {
            contactPoint: {
              "@type": "ContactPoint",
              ...(company.phone ? { telephone: company.phone } : {}),
              ...(company.email ? { email: company.email } : {}),
              contactType: "customer service",
            },
          }
        : {}),
      ...(isLocalBusiness && company.phone ? { telephone: company.phone } : {}),
      ...(isLocalBusiness && company.email ? { email: company.email } : {}),
      ...(isLocalBusiness && officeHours ? { openingHours: officeHours } : {}),
      ...(address
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: address,
            },
          }
        : {}),
      ...(latitude !== undefined && longitude !== undefined
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude,
              longitude,
            },
          }
        : {}),
      ...(areaServed
        ? {
            areaServed: {
              "@type": "Place",
              name: areaServed,
            },
          }
        : {}),
      ...(knowsAbout.length ? { knowsAbout } : {}),
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

/** Separate LocalBusiness node disabled — canonical entity lives on #organization. */
export const LocalBusinessBuilder = {
  id: "local-business",
  version: 1,
  supports(_ctx: SchemaContext): boolean {
    return false;
  },
  build(_ctx: SchemaContext): SchemaNode[] {
    return [];
  },
};
