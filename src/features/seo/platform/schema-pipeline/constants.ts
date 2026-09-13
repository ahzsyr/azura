/** Schema pipeline config version (JsonStore migration). */
export const SCHEMA_CONFIG_VERSION = 4;

/** Canonical @id URL fragments (site-scoped). */
export const SCHEMA_ID_ORGANIZATION = "organization";
export const SCHEMA_ID_BRAND = "brand";
export const SCHEMA_ID_WEBSITE = "website";
export const SCHEMA_ID_LOGO = "logo";

/** Canonical @id URL fragments (page-scoped). */
export const SCHEMA_ID_WEBPAGE = "webpage";
export const SCHEMA_ID_BREADCRUMB = "breadcrumb";
export const SCHEMA_ID_PRODUCT = "product";
export const SCHEMA_ID_OFFER = "offer";
export const SCHEMA_ID_ARTICLE = "article";
export const SCHEMA_ID_FAQPAGE = "faqpage";

export const SCHEMA_ENTITY_TYPES = [
  "Organization",
  "Corporation",
  "LocalBusiness",
  "ElectronicsStore",
  "WholesaleStore",
  "ComputerStore",
  "ProfessionalService",
  "Store",
] as const;

export type SchemaEntityType = (typeof SCHEMA_ENTITY_TYPES)[number];

export type TypeRepresentation = "most-specific" | "explicit-supertypes";
