export type { EntityStore, EntityRepository, RelationshipRepository, GraphQueryService, GraphTraversalService, EntityFilter, RelationshipFilter, TraversalStep, TraversalDirection } from "./interfaces";
export { ENTITY_TYPES, RELATIONSHIP_TYPES, RELATIONSHIP_ONTOLOGY, ORGANIZATION_CORE_PROPERTIES, isRelationshipAllowed } from "./ontology";
export {
  buildPublicEntityId,
  parsePublicEntityId,
  isPublicEntityId,
  slugifyEntitySegment,
  toEntityTypePath,
  fromEntityTypePath,
  createEntityUuid,
} from "./ids";
export {
  createGraphEntity,
  createGraphRelationship,
  propertyMeta,
  defaultConfidence,
  readPropertyValue,
  nowIso,
} from "./factory";
export {
  createInMemoryEntityStore,
  createGraphQueryService,
  createGraphTraversalService,
} from "./memory-store";
export { createPolicyEngine, DEFAULT_SOURCE_PRECEDENCE } from "./policy-engine";
export type { PolicyEngine, PolicyEngineConfig, PropertyPolicy } from "./policy-engine";
export { createNormalizationPipeline } from "./normalization";
export type { NormalizationPipeline, NormalizationResult, NormalizationIssue } from "./normalization";
export {
  companyInfoToSourceRecords,
  productToSourceRecord,
  articleToSourceRecord,
  webpageToSourceRecord,
} from "./source-mappers";
export type { CompanySourceInput } from "./source-mappers";
export { upsertLocaleView, readLocalizedProperty, listEntityLocales } from "./i18n";
