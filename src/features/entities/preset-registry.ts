import {
  LEGACY_SOURCE_TO_TYPE,
  TYPE_TO_LEGACY_SOURCE,
} from "@/features/content/content-type.registry";
import type { EntityPresetId, EntityTypeDefinition } from "@/features/entities/types";
import { isPresetEnabled } from "@/config/deployment-profile";

const CONTENT_TYPE_TO_PRESET: Record<string, EntityPresetId> = {
  products: "product",
  offerings: "service",
  "catalog-items": "destination",
  listings: "property",
};

const LEGACY_SOURCE_TO_PRESET: Record<string, EntityPresetId> = {
  packages: "destination",
  hotels: "property",
  services: "service",
};

/** All preset EntityType definitions — active and planned. */
export const ENTITY_TYPE_DEFINITIONS: EntityTypeDefinition[] = [
  {
    presetId: "product",
    labelSingularEn: "Product",
    labelPluralEn: "Products",
    labelSingularAr: "منتج",
    labelPluralAr: "منتجات",
    icon: "package",
    storage: "product",
    contentTypeSlug: "products",
    migrationPhase: "dual",
    routePolicy: "required",
    status: "active",
    adminHref: "/admin/products",
  },
  {
    presetId: "service",
    labelSingularEn: "Service",
    labelPluralEn: "Services",
    labelSingularAr: "خدمة",
    labelPluralAr: "خدمات",
    icon: "briefcase",
    storage: "content_item",
    contentTypeSlug: "offerings",
    routePolicy: "optional",
    status: "active",
    adminHref: "/admin/content/offerings",
  },
  {
    presetId: "destination",
    labelSingularEn: "Destination",
    labelPluralEn: "Destinations",
    labelSingularAr: "وجهة",
    labelPluralAr: "وجهات",
    icon: "package",
    storage: "content_item",
    contentTypeSlug: "catalog-items",
    routePolicy: "optional",
    status: "active",
    adminHref: "/admin/content/catalog-items",
  },
  {
    presetId: "property",
    labelSingularEn: "Property",
    labelPluralEn: "Properties",
    labelSingularAr: "عقار",
    labelPluralAr: "عقارات",
    icon: "building",
    storage: "content_item",
    contentTypeSlug: "listings",
    routePolicy: "required",
    status: "active",
    adminHref: "/admin/content/listings",
  },
  {
    presetId: "project",
    labelSingularEn: "Project",
    labelPluralEn: "Projects",
    icon: "box",
    storage: "portal",
    routePolicy: "optional",
    status: "planned",
    adminHref: "/admin/content/projects",
  },
  {
    presetId: "case-study",
    labelSingularEn: "Case Study",
    labelPluralEn: "Case Studies",
    icon: "box",
    storage: "portal",
    routePolicy: "optional",
    status: "planned",
    adminHref: "/admin/content/case-studies",
  },
  {
    presetId: "team-member",
    labelSingularEn: "Team Member",
    labelPluralEn: "Team",
    icon: "users",
    storage: "portal",
    routePolicy: "none",
    status: "active",
    adminHref: "/admin/team",
  },
  {
    presetId: "partner",
    labelSingularEn: "Partner",
    labelPluralEn: "Partners",
    icon: "handshake",
    storage: "portal",
    routePolicy: "optional",
    status: "active",
    adminHref: "/admin/partners",
  },
  {
    presetId: "knowledge",
    labelSingularEn: "Knowledge Article",
    labelPluralEn: "Knowledge Base",
    icon: "book-open",
    storage: "portal",
    routePolicy: "optional",
    status: "active",
    adminHref: "/admin/knowledge-base",
  },
  {
    presetId: "pricing",
    labelSingularEn: "Pricing Plan",
    labelPluralEn: "Pricing Plans",
    icon: "dollar-sign",
    storage: "portal",
    routePolicy: "optional",
    status: "active",
    adminHref: "/admin/pricing-plans",
  },
  {
    presetId: "event",
    labelSingularEn: "Event",
    labelPluralEn: "Events",
    icon: "box",
    storage: "portal",
    routePolicy: "optional",
    status: "planned",
    adminHref: "/admin/content/events",
  },
];

const byPresetId = new Map<EntityPresetId, EntityTypeDefinition>(
  ENTITY_TYPE_DEFINITIONS.map((def) => [def.presetId, def]),
);

export function isEntityPresetId(value: string): value is EntityPresetId {
  return byPresetId.has(value as EntityPresetId);
}

export function getEntityTypeDefinition(presetId: EntityPresetId): EntityTypeDefinition | null {
  return byPresetId.get(presetId) ?? null;
}

export function listEntityTypeDefinitions(options?: {
  includePlanned?: boolean;
  profileAware?: boolean;
}): EntityTypeDefinition[] {
  const includePlanned = options?.includePlanned ?? false;
  const profileAware = options?.profileAware !== false;
  return ENTITY_TYPE_DEFINITIONS.filter((def) => {
    if (def.status !== "active" && !includePlanned) return false;
    if (profileAware && !isPresetEnabled(def.presetId)) return false;
    return true;
  });
}

export function resolvePresetByContentTypeSlug(slug: string): EntityPresetId | null {
  return CONTENT_TYPE_TO_PRESET[slug] ?? null;
}

export function resolvePresetByLegacySource(source: string): EntityPresetId | null {
  if (source in LEGACY_SOURCE_TO_PRESET) {
    return LEGACY_SOURCE_TO_PRESET[source] ?? null;
  }
  const typeSlug = LEGACY_SOURCE_TO_TYPE[source];
  return typeSlug ? resolvePresetByContentTypeSlug(typeSlug) : null;
}

/** Reverse lookup: preset → legacy catalog source key (packages, hotels, services). */
export function resolveLegacySourceByPreset(presetId: EntityPresetId): string | null {
  const def = getEntityTypeDefinition(presetId);
  if (!def?.contentTypeSlug) return null;
  return TYPE_TO_LEGACY_SOURCE[def.contentTypeSlug] ?? null;
}
