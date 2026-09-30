import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import { entityUrl } from "../identity/canonical-url.service";
import { isLocalBusinessEntityType, resolveOrganizationSchemaType } from "../type-model";

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

export const OrganizationBuilder = {
  id: "organization",
  version: 2,
  supports(ctx: SchemaContext): boolean {
    return Boolean(ctx.site.company?.name);
  },
  provenance(_ctx: SchemaContext, node: SchemaNode) {
    const map: Record<string, string> = {};
    if (node.name) map.name = "company.name";
    if (node.legalName) map.legalName = "company.schema.legalName";
    if (node.description) map.description = "company.schema.schemaDescription";
    if (node.logo) map.logo = "theme.logo";
    if (node.address) map.address = "company.address";
    if (node.telephone) map.telephone = "company.phone";
    if (node.email) map.email = "company.email";
    if (node.sameAs) map.sameAs = "company.socialLinks";
    if (node.geo) map.geo = "company.schema.geo";
    if (node.areaServed) map.areaServed = "company.schema.areaServed";
    if (node.brand) map.brand = "theme.brand";
    return map;
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
    const entityType = ctx.site.structuredConfig.entityType;
    const isLocalBusiness = isLocalBusinessEntityType(entityType);
    const sameAs = parseSameAs(company.socialLinks);

    const node: SchemaNode = {
      "@type": resolveOrganizationSchemaType(ctx.site.structuredConfig),
      "@id": entityUrl("organization", ctx),
      name: company.name,
      url: ctx.runtime.siteOrigin.replace(/\/$/, ""),
      brand: entityRef("brand", ctx),
      ...(ctx.site.logoUrl ? { logo: entityRef("logo", ctx) } : {}),
      ...(legalName ? { legalName } : {}),
      ...(schemaDescription ? { description: schemaDescription } : {}),
      ...(foundingDate ? { foundingDate } : {}),
      ...(sameAs.length ? { sameAs } : {}),
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
      ...(company.registrationNo ? { identifier: company.registrationNo } : {}),
    };

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
