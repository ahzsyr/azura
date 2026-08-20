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
