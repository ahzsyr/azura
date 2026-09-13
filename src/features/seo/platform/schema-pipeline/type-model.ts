import type { SeoStructuredConfig } from "@/features/seo/types";
import { SCHEMA_ENTITY_TYPES, type SchemaEntityType, type TypeRepresentation } from "./constants";

export type BusinessTypeFamily = "organization" | "localBusiness";

export type GoogleFeatureKind = "organization" | "localBusiness";

export type BusinessTypeMetadata = {
  family: BusinessTypeFamily;
  googleFeature: GoogleFeatureKind;
};

const ORGANIZATION_FAMILY_TYPES = new Set<string>([
  "Organization",
  "Corporation",
  "LocalBusiness",
  "ElectronicsStore",
  "WholesaleStore",
  "ComputerStore",
  "ProfessionalService",
  "Store",
]);

const LOCAL_BUSINESS_TYPES = new Set<string>([
  "LocalBusiness",
  "ElectronicsStore",
  "WholesaleStore",
  "ComputerStore",
  "ProfessionalService",
  "Store",
]);

const BUSINESS_TYPE_METADATA: Record<SchemaEntityType, BusinessTypeMetadata> = {
  Organization: { family: "organization", googleFeature: "organization" },
  Corporation: { family: "organization", googleFeature: "organization" },
  LocalBusiness: { family: "localBusiness", googleFeature: "localBusiness" },
  ElectronicsStore: { family: "localBusiness", googleFeature: "localBusiness" },
  WholesaleStore: { family: "localBusiness", googleFeature: "localBusiness" },
  ComputerStore: { family: "localBusiness", googleFeature: "localBusiness" },
  ProfessionalService: { family: "localBusiness", googleFeature: "localBusiness" },
  Store: { family: "localBusiness", googleFeature: "localBusiness" },
};

export function classifyBusinessType(entityType: string | undefined): SchemaEntityType {
  if (entityType && SCHEMA_ENTITY_TYPES.includes(entityType as SchemaEntityType)) {
    return entityType as SchemaEntityType;
  }
  return "Organization";
}

export function getBusinessTypeMetadata(entityType: string | undefined): BusinessTypeMetadata {
  return BUSINESS_TYPE_METADATA[classifyBusinessType(entityType)];
}

export function isLocalBusinessEntityType(type: string | undefined): boolean {
  if (!type) return false;
  return LOCAL_BUSINESS_TYPES.has(type);
}

export function satisfiesOrganizationFamily(nodeType: unknown): boolean {
  if (typeof nodeType === "string") {
    return ORGANIZATION_FAMILY_TYPES.has(nodeType);
  }
  if (Array.isArray(nodeType)) {
    return nodeType.some((item) => typeof item === "string" && ORGANIZATION_FAMILY_TYPES.has(item));
  }
  return false;
}

export function resolveTypeRepresentation(config?: SeoStructuredConfig): TypeRepresentation {
  return config?.typeRepresentation ?? "most-specific";
}

/** Resolve @type for the canonical organization/business node. */
export function resolveOrganizationSchemaType(config?: SeoStructuredConfig): string | string[] {
  const entityType = classifyBusinessType(config?.entityType);
  const representation = resolveTypeRepresentation(config);

  if (representation === "explicit-supertypes" && isLocalBusinessEntityType(entityType)) {
    return ["Organization", entityType];
  }

  return entityType;
}
